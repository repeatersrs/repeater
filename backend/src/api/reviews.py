from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.auth.jwt import get_current_user
from src.const import (
    SCHEDULE_DEFAULT_EASE_FACTOR,
    SCHEDULE_DEFAULT_INTERVAL,
    SCHEDULE_DEFAULT_REPETITIONS,
)
from src.db import get_db
from src.db.models import Card, Review, User
from src.schedulers import Scheduler
from src.schedulers.basic import BasicScheduler
from src.schemas.review import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["reviews"])


def get_scheduler() -> Scheduler:
    return BasicScheduler()


@router.post("", response_model=ReviewOut, status_code=201)
def create_review(
    review_req: ReviewCreate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
    scheduler: Scheduler = Depends(get_scheduler),
):
    card = Card.get_user_card(review_req.card_id, user.id, db_session)
    last_review = (
        Review.filter_by(db_session, card_id=card.id)
        .order_by(Review.reviewed_at.desc())
        .first()
    )

    repetitions = SCHEDULE_DEFAULT_REPETITIONS
    ease_factor = SCHEDULE_DEFAULT_EASE_FACTOR
    interval = SCHEDULE_DEFAULT_INTERVAL

    if last_review:
        repetitions = last_review.repetitions
        ease_factor = last_review.ease_factor
        interval = last_review.interval

    schedule_result = scheduler.schedule(
        review_req.feedback, repetitions, ease_factor, interval
    )

    card.next_review_date = schedule_result.next_review_date
    card.save(db_session)

    review = Review(
        card_id=card.id,
        deck_id=card.deck.id,
        user_id=user.id,
        card_content=card.content,
        deck_name=card.deck.name,
        feedback=review_req.feedback,
        interval=schedule_result.interval,
        repetitions=schedule_result.repetitions,
        ease_factor="{:.2f}".format(schedule_result.ease_factor),
    )
    review.save(db_session)
    return review


@router.get("/{card_id}", response_model=List[ReviewOut])
def get_review_history(
    card_id: UUID,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    card = Card.get_user_card(card_id, user.id, db_session)
    return (
        Review.filter_by(db_session, card_id=card.id)
        .order_by(Review.reviewed_at.desc())
        .all()
    )
