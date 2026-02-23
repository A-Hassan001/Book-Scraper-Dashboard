from books_scraper.spiders.database import DatabaseManager
from books_scraper.spiders.models import Detail
from sqlalchemy import func, select


def main():
    db = DatabaseManager()

    print("Starting duplicate cleanup...")

    subq = (
        db.session.query(
            func.max(Detail.detail_id).label("keep_id")
        )
        .group_by(Detail.history_id, Detail.isbn, Detail.url)
        .subquery()
    )

    deleted = (
        db.session.query(Detail)
        .filter(Detail.detail_id.not_in(select(subq.c.keep_id)))
        .delete(synchronize_session=False)
    )

    db.session.commit()

    print(f"Removed {deleted} duplicate rows")

    db.close()
    print("Done.")

if __name__ == "__main__":
    main()
