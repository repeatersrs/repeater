import json
import logging

from dacite import from_dict
from fastapi import UploadFile

from src.import_export import REPEATER_JSON_VERSION_LATEST, BaseImporter, DeckData


class CustomImporter(BaseImporter):
    async def parse(self, file: UploadFile) -> DeckData:
        try:
            content = await file.read()
            json_obj = json.loads(content.decode("utf-8"))
            version = json_obj.get("version")
            if version == REPEATER_JSON_VERSION_LATEST:
                deck_data = from_dict(data_class=DeckData, data=json_obj)
                return deck_data
            else:
                raise ValueError(f"Unknown version {version}")
        except Exception as err:
            logging.error(f"Failed to import file: {err}")
            raise
