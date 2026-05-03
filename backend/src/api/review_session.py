from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, contains_eager

from src.auth.jwt import get_current_user
from src.db import get_db
from src.db.models import Card, Deck, Review, User
from src.schemas.review_session import ReviewSessionCard, ReviewSessionOut

router = APIRouter(prefix="/review-session", tags=["review_session"])


@router.get("", response_model=ReviewSessionOut)
def get_review_session(
    deck_id: UUID | None = None,
    user_tz: str
    | None = None,  # TODO: Accept user timezone to allow local midnight as cut-off for review day
    exclude_paused: bool = True,
    exclude_archived: bool = True,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=9999)

    cards_reviewed_today = (
        db_session.query(Review)
        .filter(Review.user_id == user.id)
        .filter(Review.undone_at.is_(None))
        .filter(Review.reviewed_at >= today_start)
        .distinct()
        .subquery()
    )
    cards_undone_today = (
        db_session.query(
            Review.card_id,
            func.max(Review.undone_at).label("last_undone_at"),
        )
        .filter(Review.user_id == user.id)
        .filter(Review.undone_at >= today_start)
        .group_by(Review.card_id)
        .subquery()
    )

    query = (
        db_session.query(Card)
        .join(Deck)
        .outerjoin(cards_undone_today, cards_undone_today.c.card_id == Card.id)
        .filter(Deck.user_id == user.id)
        .options(contains_eager(Card.deck))
        .filter(
            or_(
                Card.due_date <= today_end,
                Card.id.in_(db_session.query(cards_reviewed_today.c.card_id)),
            )
        )
        .order_by(
            case((cards_undone_today.c.last_undone_at.is_(None), 1), else_=0),
            cards_undone_today.c.last_undone_at.desc(),
            Card.due_date,
            Card.created_at,
        )
    )

    if deck_id:
        query = query.filter(Deck.id == deck_id)

    if exclude_paused:
        query = query.filter(Deck.is_paused == False)

    if exclude_archived:
        query = query.filter(Deck.is_archived == False)

    cards = query.all()

    card_ids = [card.id for card in cards]

    todays_reviews = []
    if card_ids:
        todays_reviews = (
            db_session.query(Review)
            .filter(Review.user_id == user.id)
            .filter(Review.undone_at.is_(None))
            .filter(Review.card_id.in_(card_ids))
            .filter(Review.reviewed_at >= today_start)
            .order_by(Review.reviewed_at)
            .all()
        )

    reviews_by_card = {}
    for review in todays_reviews:
        if review.card_id not in reviews_by_card:
            reviews_by_card[review.card_id] = []
        reviews_by_card[review.card_id].append(review)

    remaining = []
    completed = []
    failed = []

    for card in cards:
        card_reviews = reviews_by_card.get(card.id, [])
        review_session_card = ReviewSessionCard.from_card(card, card_reviews)

        if not card_reviews:
            remaining.append(review_session_card)
        elif any(review.feedback == "ok" for review in card_reviews):
            completed.append(review_session_card)
        else:
            failed.append(review_session_card)

    return ReviewSessionOut(
        date=today_start, remaining=remaining, completed=completed, failed=failed
    )
