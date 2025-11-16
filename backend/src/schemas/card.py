from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel

from src.db.models import Card, Review
from src.schemas.review import ReviewOut
from src.util.validators import StrippedStr


class CardCreate(BaseModel):
    deck_id: UUID
    content: StrippedStr


class CardOut(BaseModel):
    id: UUID
    deck_id: UUID
    deck_name: str
    content: str
    next_review_date: datetime
    overdue: bool
    created_at: datetime
    updated_at: datetime
    todays_reviews: List[ReviewOut] | None = None

    @classmethod
    def from_card(
        cls, card: Card, todays_reviews: List[Review] | None = None
    ) -> CardOut:
        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        next_review_day = card.next_review_date.replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        return cls(
            **card.__dict__,
            deck_name=card.deck.name,
            overdue=next_review_day < today,
            todays_reviews=[
                ReviewOut.model_validate(review) for review in todays_reviews
            ]
            if todays_reviews
            else None,
        )


class CardUpdate(BaseModel):
    deck_id: Optional[UUID] = None
    content: Optional[StrippedStr] = None
