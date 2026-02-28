#!/usr/bin/env python3
"""
SQLite to PostgreSQL Migration Script

Requirements:
    pip install psycopg2-binary

Usage:
    1. Fill in the CONFIGURATION section below.
    2. Run: python sqlite_to_postgres.py
"""

import sqlite3
import psycopg2
import sys
import logging
from datetime import datetime, timezone

# ─── CONFIGURATION ────────────────────────────────────────────────────────────

SQLITE_DB_PATH = r"C:\Users\Ali Hassan\Downloads\Books Scraper\Books Scraper\Books Scraper\backend\db.sqlite3"   # Path to your SQLite .db file

PG_HOST     = "metro.proxy.rlwy.net"             # e.g. "db.example.com"
PG_PORT     = 54764
PG_DATABASE = "railway"
PG_USER     = "postgres"
PG_PASSWORD = "dCukENrDTfGFleuzfyPeGnrETcaDbXyM"

# ONLY this table gets a 'first_seen' DATE column (e.g. 2026-02-25).
# Every other table will have 'first_seen' removed if it already exists.
FIRST_SEEN_TABLE = "details_table"
DROP_AND_RECREATE = False

# ──────────────────────────────────────────────────────────────────────────────

# SQLite internal tables — never migrate these
SKIP_TABLES = {
    "sqlite_sequence", "sqlite_stat1", "sqlite_stat2",
    "sqlite_stat3", "sqlite_stat4",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def sqlite_type_to_pg(sqlite_type: str) -> str:
    t = sqlite_type.upper().strip()
    if not t or t == "BLOB":           return "BYTEA"
    if "INT"     in t:                 return "BIGINT"
    if any(k in t for k in ("CHAR", "CLOB", "TEXT")): return "TEXT"
    if any(k in t for k in ("REAL", "FLOA", "DOUB")): return "DOUBLE PRECISION"
    if "BOOL"    in t:                 return "BOOLEAN"
    if any(k in t for k in ("DATE", "TIME")):          return "TIMESTAMP"
    if any(k in t for k in ("NUMERIC", "DECIMAL")):    return "NUMERIC"
    return "TEXT"


def cast_value(value, pg_type: str):
    if value is None:
        return None
    if pg_type == "BOOLEAN":
        return bool(value)   # SQLite stores booleans as 0/1
    return value


def get_tables(sqlite_conn) -> list:
    cur = sqlite_conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    return [r[0] for r in cur.fetchall() if r[0] not in SKIP_TABLES]


def get_schema(sqlite_conn, table: str) -> list:
    """Returns list of (column_name, sqlite_type)."""
    cur = sqlite_conn.cursor()
    cur.execute(f'PRAGMA table_info("{table}");')
    return [(row[1], row[2]) for row in cur.fetchall()]


def get_fk_parents(sqlite_conn, table: str) -> set:
    cur = sqlite_conn.cursor()
    cur.execute(f'PRAGMA foreign_key_list("{table}");')
    return {row[2] for row in cur.fetchall()}


def topological_sort(tables: list, sqlite_conn) -> list:
    """Return tables ordered so FK parents come before children."""
    table_set = set(tables)
    deps = {t: get_fk_parents(sqlite_conn, t) & table_set for t in tables}
    ordered, visited = [], set()

    def visit(t, chain=None):
        chain = chain or set()
        if t in visited: return
        if t in chain:
            log.warning(f"  Circular FK on '{t}', will migrate as-is.")
            return
        chain.add(t)
        for parent in deps.get(t, []):
            visit(parent, chain)
        visited.add(t)
        ordered.append(t)

    for t in tables:
        visit(t)
    return ordered


def pg_column_exists(pg_cur, table: str, column: str) -> bool:
    pg_cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_name = %s AND column_name = %s);",
        (table, column),
    )
    return pg_cur.fetchone()[0]


def pg_table_exists(pg_cur, table: str) -> bool:
    pg_cur.execute(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
        "WHERE table_name = %s);",
        (table,),
    )
    return pg_cur.fetchone()[0]


# ── Per-table migration ────────────────────────────────────────────────────────

def migrate_table(sqlite_conn, pg_conn, table: str):
    log.info(f"  [{table}]")
    schema = get_schema(sqlite_conn, table)

    if not schema:
        log.warning(f"    No columns found, skipping.")
        return

    pg_cur = pg_conn.cursor()

    # ── first_seen handling ───────────────────────────────────────────────────
    inject_first_seen = False

    if table == FIRST_SEEN_TABLE:
        existing_cols = [col for col, _ in schema]
        if "first_seen" not in existing_cols:
            inject_first_seen = True
            schema = schema + [("first_seen", "DATE")]
            if not pg_column_exists(pg_cur, table, "first_seen"):
                if pg_table_exists(pg_cur, table):
                    pg_cur.execute(f'ALTER TABLE "{table}" ADD COLUMN "first_seen" DATE;')
                    pg_conn.commit()
                    log.info(f"    Added 'first_seen' DATE column.")
        else:
            log.info(f"    'first_seen' already in SQLite schema, migrating as-is.")
    else:
        # Remove first_seen from any other table (cleanup from old runs)
        if pg_table_exists(pg_cur, table) and pg_column_exists(pg_cur, table, "first_seen"):
            pg_cur.execute(f'ALTER TABLE "{table}" DROP COLUMN "first_seen";')
            pg_conn.commit()
            log.info(f"    Removed stale 'first_seen' column.")

    # ── Fetch rows ────────────────────────────────────────────────────────────
    cur = sqlite_conn.cursor()
    cur.execute(f'SELECT * FROM "{table}";')
    rows = cur.fetchall()

    if not rows:
        log.info(f"    No rows to migrate.")
        return

    # ── Build INSERT ──────────────────────────────────────────────────────────
    pg_type_map  = {col: sqlite_type_to_pg(dtype) for col, dtype in schema}
    col_names    = ", ".join(f'"{col}"' for col, _ in schema)
    placeholders = ", ".join(["%s"] * len(schema))
    insert_sql   = (
        f'INSERT INTO "{table}" ({col_names}) '
        f'VALUES ({placeholders}) ON CONFLICT DO NOTHING'
    )

    # Columns that come from SQLite (excludes injected first_seen)
    src_cols = [col for col, _ in schema if col != "first_seen"] if inject_first_seen \
               else [col for col, _ in schema]

    today = datetime.now(timezone.utc).date()

    def process(row):
        casted = tuple(cast_value(v, pg_type_map[c]) for v, c in zip(row, src_cols))
        return casted + (today,) if inject_first_seen else casted

    processed_rows = [process(r) for r in rows]

    if inject_first_seen:
        log.info(f"    Injecting first_seen = {today}")

    # ── Batch insert ──────────────────────────────────────────────────────────
    BATCH = 500
    inserted = 0
    for i in range(0, len(processed_rows), BATCH):
        pg_cur.executemany(insert_sql, processed_rows[i : i + BATCH])
        inserted += pg_cur.rowcount

    pg_conn.commit()
    skipped = len(rows) - inserted
    if skipped:
        log.info(f"    Inserted {inserted:,} rows  |  Skipped {skipped:,} duplicates.")
    else:
        log.info(f"    Inserted {inserted:,} rows.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Connect SQLite
    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
        log.info(f"Connected to SQLite: {SQLITE_DB_PATH}")
    except Exception as e:
        log.error(f"Cannot open SQLite: {e}")
        sys.exit(1)

    # Connect PostgreSQL
    try:
        pg_conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT,
            dbname=PG_DATABASE, user=PG_USER, password=PG_PASSWORD,
        )
        log.info(f"Connected to PostgreSQL: {PG_USER}@{PG_HOST}/{PG_DATABASE}")
    except Exception as e:
        log.error(f"Cannot connect to PostgreSQL: {e}")
        sqlite_conn.close()
        sys.exit(1)

    # Resolve migration order (FK parents first)
    tables = get_tables(sqlite_conn)
    tables = topological_sort(tables, sqlite_conn)
    log.info(f"Tables to migrate ({len(tables)}): {', '.join(tables)}")

    pg_cur = pg_conn.cursor()

    # Disable FK checks so we can insert in any order safely
    pg_cur.execute("SET session_replication_role = 'replica';")
    pg_conn.commit()
    log.info("FK constraints disabled for migration.")

    for table in tables:
        try:
            migrate_table(sqlite_conn, pg_conn, table)
        except Exception as e:
            log.error(f"  ERROR on '{table}': {e}")
            pg_conn.rollback()

    # Re-enable FK checks
    pg_cur.execute("SET session_replication_role = 'origin';")
    pg_conn.commit()
    log.info("FK constraints re-enabled.")

    sqlite_conn.close()
    pg_conn.close()
    log.info("Migration complete.")


if __name__ == "__main__":
    main()
