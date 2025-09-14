import logging
import zipfile
from datetime import datetime
from io import BytesIO
from pathlib import PurePosixPath

from fastapi import UploadFile

from src.import_export import (
    REPEATER_JSON_VERSION_LATEST,
    BaseImporter,
    CardData,
    DeckData,
)

"""
Importer for the Mochi markdown export format.

Supports:
    - Text cards as .md files (directly or part of .zip)
    - .zip Mochi exports including sub-decks

Note: support for specific card and/or content types are all TBD
"""


class MochiMarkdownImporter(BaseImporter):
    async def parse_file(self, file: UploadFile) -> DeckData:
        filename = file.filename
        if filename is None:
            raise ValueError("No filename provided")

        content = await file.read()
        path = PurePosixPath(filename)

        if path.suffix == ".md":
            card_data = self._parse_markdown_bytes(content)

            return DeckData(
                version=REPEATER_JSON_VERSION_LATEST,
                name=path.stem,
                description=None,
                cards=[card_data],
                sub_decks=[],
            )
        elif path.suffix == ".zip" or self._looks_like_zip(content):
            return self._parse_zip_bytes(content, path.stem)
        else:
            raise ValueError("Invalid file format")

    def parse_bytes(self, content: bytes) -> DeckData:
        if self._looks_like_zip(content):
            return self._parse_zip_bytes(content)
        else:
            card_data = self._parse_markdown_bytes(content)
            return DeckData(
                version=REPEATER_JSON_VERSION_LATEST,
                name=f"Imported deck {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                description=None,
                cards=[card_data],
                sub_decks=[],
            )

    # Helpers

    def _parse_markdown_bytes(self, content: bytes) -> CardData:
        card_content = content.decode("utf-8", errors="replace")
        return CardData(card_content)

    def _looks_like_zip(self, content: bytes) -> bool:
        try:
            return zipfile.is_zipfile(BytesIO(content))
        except Exception:
            return False

    def _parse_zip_bytes(
        self, content: bytes, root_name: str | None = None
    ) -> DeckData:
        """
        Structure rules:
            - each folder -> a sub-deck (recursively)
            - .md files -> cards at the appropriate deck level
            - non-.md files are ignored
        """
        if root_name is None:
            root_name = f"Imported deck {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        class DeckNode:
            __slots__ = ("name", "cards", "children")

            def __init__(self, name: str):
                self.name = name
                self.cards: list[CardData] = []
                self.children: dict[str, "DeckNode"] = {}

        root = DeckNode(name=root_name)

        def get_or_create_node_at_path(parts: list[str]) -> DeckNode:
            node = root
            for p in parts:
                if p == "":
                    continue
                if p not in node.children:
                    node.children[p] = DeckNode(name=p)
                node = node.children[p]
            return node

        with zipfile.ZipFile(BytesIO(content), "r") as zip_file:
            for info in zip_file.infolist():
                if "__MACOSX" in info.filename:
                    continue

                path = PurePosixPath(info.filename)
                # Skip the root folder from all paths
                path_parts = path.parts[1:] if len(path.parts) > 1 else []

                if info.is_dir():
                    if path_parts:
                        get_or_create_node_at_path(list(path_parts))
                    continue

                if path.name.startswith("."):
                    continue

                if path.suffix.lower() == ".md":
                    with zip_file.open(info, "r") as file_handler:
                        text = file_handler.read().decode("UTF-8", errors="replace")
                    dir_parts = list(path_parts[:-1]) if path_parts else []
                    deck_node = get_or_create_node_at_path(dir_parts)
                    deck_node.cards.append(CardData(text))
                else:
                    logging.info(f"Ignoring unsupported file: {info.filename}")

        def deck_node_to_deck_data(node: DeckNode) -> DeckData:
            sub_decks = [
                deck_node_to_deck_data(child) for child in node.children.values()
            ]
            return DeckData(
                version=REPEATER_JSON_VERSION_LATEST,
                name=node.name,
                description=None,
                cards=node.cards or [],
                sub_decks=sub_decks or [],
            )

        return deck_node_to_deck_data(root)
