from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
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
        Review.filter_by(db_session, card_id=card.id, undone_at=None)
        .order_by(Review.reviewed_at.desc())
        .first()
    )

    # If the user reviewed after undoing, discard the redo tail for this card.
    db_session.query(Review).filter(
        Review.card_id == card.id,
        Review.user_id == user.id,
        Review.undone_at.is_not(None),
    ).delete(synchronize_session=False)

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

    previous_due_date = card.due_date
    card.due_date = schedule_result.due_date
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
        previous_due_date=previous_due_date,
        due_date=schedule_result.due_date,
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
        Review.filter_by(db_session, card_id=card.id, undone_at=None)
        .order_by(Review.reviewed_at.desc())
        .all()
    )


@router.post("/{review_id}/undo", response_model=ReviewOut)
def undo_review(
    review_id: UUID,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    review = Review.filter_by(db_session, id=review_id, user_id=user.id).one()
    if review.undone_at is not None:
        raise HTTPException(status_code=409, detail="Review is already undone")

    latest_active_review = (
        Review.filter_by(
            db_session, card_id=review.card_id, user_id=user.id, undone_at=None
        )
        .order_by(Review.reviewed_at.desc())
        .first()
    )
    if latest_active_review is None or latest_active_review.id != review.id:
        raise HTTPException(
            status_code=409, detail="Only the latest review can be undone"
        )

    if review.previous_due_date is None:
        raise HTTPException(status_code=409, detail="Review cannot be undone")

    card = Card.get_user_card(review.card_id, user.id, db_session)
    card.due_date = review.previous_due_date
    review.undone_at = datetime.now(timezone.utc)
    db_session.commit()
    db_session.refresh(review)
    return review


@router.post("/{review_id}/redo", response_model=ReviewOut)
def redo_review(
    review_id: UUID,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    review = Review.filter_by(db_session, id=review_id, user_id=user.id).one()
    if review.undone_at is None:
        raise HTTPException(status_code=409, detail="Review is not undone")

    latest_active_review = (
        Review.filter_by(
            db_session, card_id=review.card_id, user_id=user.id, undone_at=None
        )
        .order_by(Review.reviewed_at.desc())
        .first()
    )
    undone_query = Review.filter_by(
        db_session, card_id=review.card_id, user_id=user.id
    ).filter(Review.undone_at.is_not(None))
    if latest_active_review:
        undone_query = undone_query.filter(
            Review.reviewed_at > latest_active_review.reviewed_at
        )
    next_redo_review = undone_query.order_by(Review.reviewed_at.asc()).first()
    if next_redo_review is None or next_redo_review.id != review.id:
        raise HTTPException(
            status_code=409, detail="Review is not next in redo history"
        )

    card = Card.get_user_card(review.card_id, user.id, db_session)
    card.due_date = review.due_date
    review.undone_at = None
    db_session.commit()
    db_session.refresh(review)
    return review
