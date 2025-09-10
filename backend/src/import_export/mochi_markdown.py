
from fastapi import UploadFile
from datetime import datetime
from src.import_export import REPEATER_JSON_VERSION_LATEST, BaseImporter, CardData, DeckData

"""
Importer for the Mochi markdown export format.

Supports:
    - Text cards as .md files (directly or part of .zip)
    - .zip Mochi exports including sub-decks

Note: support for specific card and/or content types are all TBD
"""
class MochiMarkdownImporter(BaseImporter):
    async def parse(self, file: UploadFile) -> DeckData:
        filename = file.filename
        if filename == None:
            raise ValueError("No filename provided")
            return

        if filename.endswith('.md'):
            content = await file.read()
            card_content = content.decode('utf-8')
            card_data = CardData(card_content)

            return DeckData(
                version=REPEATER_JSON_VERSION_LATEST,
                name=f"Imported deck {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                description=None,
                cards=[card_data]
            )
        elif filename.endswith('.zip'):
            # TODO:
            # - extract .zip
            # - loop through each child file
            #   - for .md files: create card
            #       - (optional): ignore/log if the card includes known unsupported things like <ai></ai> or <speech></speech>
            #   - for folders: create sub-decks
            #   - for other files: ignore/log
            pass
        else:
            raise ValueError("Invalid file format")
