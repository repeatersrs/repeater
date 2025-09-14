from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import List
from uuid import UUID

from fastapi import UploadFile
from sqlalchemy.orm import Session

from src.db.models import Card, Deck

REPEATER_JSON_VERSION_LATEST = "repeater-v1"


@dataclass
class CardData:
    content: str


@dataclass
class DeckData:
    version: str
    name: str
    description: str | None
    cards: List[CardData]
    sub_decks: List[DeckData]


def deck_to_deck_data(deck: Deck) -> DeckData:
    cards = []
    for card in deck.cards:
        cards.append(CardData(content=card.content))

    sub_decks = []
    for child_deck in deck.children:
        sub_decks.append(deck_to_deck_data(child_deck))

    return DeckData(
        version=REPEATER_JSON_VERSION_LATEST,
        name=deck.name,
        description=deck.description,
        cards=cards,
        sub_decks=sub_decks,
    )


def store_imported_deck(
    deck_data: DeckData,
    user_id: UUID,
    db_session: Session,
    parent_id: UUID | None = None,
):
    try:
        deck = Deck(
            user_id=user_id,
            parent_id=parent_id,
            name=deck_data.name,
            description=deck_data.description,
        )
        db_session.add(deck)
        db_session.flush()

        if deck_data.sub_decks:
            for sub_deck in deck_data.sub_decks:
                store_imported_deck(sub_deck, user_id, db_session, parent_id=deck.id)

        for card_data in deck_data.cards:
            card = Card(deck_id=deck.id, content=card_data.content)
            db_session.add(card)

        db_session.commit()
    except Exception:
        db_session.rollback()
        raise


def export(deck: DeckData) -> bytes:
    deck_dict = asdict(deck)
    json_str = json.dumps(deck_dict)
    return json_str.encode("utf-8")


class BaseImporter(ABC):
    @abstractmethod
    async def parse_file(self, file: UploadFile) -> DeckData:
        pass

    @abstractmethod
    def parse_bytes(self, content: bytes) -> DeckData:
        pass
