# cleandb_wallapop.py

from books_scraper.spiders.database import DatabaseManager
from books_scraper.spiders.models import Source, History, Detail
from sqlalchemy import select, delete

def main():
    db = DatabaseManager()
    try:
        # Get Wallapop spider_id
        wallapop = db.session.execute(
            select(Source).where(Source.spider_name == "wallapop")
        ).scalar_one_or_none()

        if not wallapop:
            print("Wallapop spider not found in database.")
            return

        spider_id = wallapop.spider_id
        print(f"Deleting records for Wallapop (spider_id={spider_id})...")

        # Delete Detail records
        history_ids = db.session.execute(
            select(History.history_id).where(History.site_id == spider_id)
        ).scalars().all()

        if history_ids:
            db.session.execute(
                delete(Detail).where(Detail.history_id.in_(history_ids))
            )
            db.session.execute(
                delete(History).where(History.history_id.in_(history_ids))
            )

        # Optionally, delete the Source record
        db.session.execute(delete(Source).where(Source.spider_id == spider_id))

        db.session.commit()
        print("Wallapop records deleted successfully!")

    except Exception as e:
        print("Error:", e)
        db.session.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
