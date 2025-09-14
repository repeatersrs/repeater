from src.db import get_db
from src.db.models import UserRole
from src.import_export import BaseImporter, store_imported_deck
from src.import_export.custom import CustomImporter
from src.util import add_user

BOOTSTRAP_DECKS_JSON_PATHS = ["data/languages.json"]


def bootstrap():
    with next(get_db()) as db_session:
        user = add_user("user@domain.com", "password", UserRole.USER, db_session)

        for deck_path in BOOTSTRAP_DECKS_JSON_PATHS:
            with open(deck_path, "rb") as file:
                content = file.read()
                importer: BaseImporter = CustomImporter()
                deck_data = importer.parse_bytes(content)
                store_imported_deck(deck_data, user.id, db_session)


if __name__ == "__main__":
    bootstrap()
