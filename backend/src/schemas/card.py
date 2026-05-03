from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel

from src.db.models import Card
from src.util.validators import StrippedStr


class CardCreate(BaseModel):
    deck_id: UUID
    content: StrippedStr


class CardOut(BaseModel):
    id: UUID
    deck_id: UUID
    deck_name: str
    deck_path: List[Dict[str, str]]
    content: str
    due_date: datetime
    overdue: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_card(cls, card: Card) -> "CardOut":
        now = datetime.now(timezone.utc)
        return cls(
            **card.__dict__,
            deck_name=card.deck.name,
            deck_path=card.deck.path,
            overdue=now >= card.due_date + timedelta(hours=24),
        )


class CardUpdate(BaseModel):
    deck_id: Optional[UUID] = None
    content: Optional[StrippedStr] = None
