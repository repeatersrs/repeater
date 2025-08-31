from src.db import get_db
from src.db.models import UserRole
from src.import_export import BaseImporter, store_imported_deck
from src.import_export.custom import CustomImporter
from src.util import add_user

FRENCH_DECK_JSON_PATH = "data/french.json"
CHINESE_DECK_JSON_PATH = "data/chinese.json"


def bootstrap():
    with next(get_db()) as db_session:
        user = add_user("user@domain.com", "password", UserRole.USER, db_session)

        for deck_path in {FRENCH_DECK_JSON_PATH, CHINESE_DECK_JSON_PATH}:
            with open(deck_path, "rb") as file:
                content = file.read()
                importer: BaseImporter = CustomImporter()
                deck_data = importer.parse(content)
                store_imported_deck(deck_data, user.id, db_session)


if __name__ == "__main__":
    bootstrap()
