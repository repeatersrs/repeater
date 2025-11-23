from datetime import datetime, timezone
from typing import List
from uuid import UUID

from pydantic import BaseModel

from src.db.models import Card, Review
from src.schemas.review import ReviewOut


class ReviewSessionCard(BaseModel):
    id: UUID
    deck_id: UUID
    deck_name: str
    content: str
    next_review_date: datetime
    overdue: bool
    todays_reviews: List[ReviewOut]
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_card(cls, card: Card, todays_reviews: List[Review]) -> "ReviewSessionCard":
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        next_review_date_start = card.next_review_date.replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        return cls(
            **card.__dict__,
            deck_name=card.deck.name,
            overdue=next_review_date_start < today_start,
            todays_reviews=[
                ReviewOut.model_validate(review, from_attributes=True)
                for review in todays_reviews
            ],
        )


class ReviewSessionOut(BaseModel):
    date: datetime
    remaining: List[ReviewSessionCard]
    completed: List[ReviewSessionCard]
    failed: List[ReviewSessionCard]
