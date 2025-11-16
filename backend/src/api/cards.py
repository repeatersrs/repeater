from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session, contains_eager

from src.auth.jwt import get_current_user
from src.db import get_db
from src.db.models import Card, Deck, Review, User
from src.schemas.card import CardCreate, CardOut, CardUpdate
from src.util import get_user_card

router = APIRouter(prefix="/cards", tags=["cards"])


@router.post("", response_model=CardOut, status_code=201)
def create_card(
    card_req: CardCreate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    deck = Deck.filter_by(db_session, id=card_req.deck_id, user_id=user.id).one()
    card = Card(deck_id=deck.id, content=card_req.content)
    card.save(db_session)
    return CardOut.from_card(card)


@router.get("", response_model=List[CardOut])
def get_cards(
    deck_id: UUID | None = None,
    only_due: bool = False,
    review_session: bool = False,
    exclude_paused: bool = False,
    exclude_archived: bool = False,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    query = (
        db_session.query(Card)
        .join(Deck)
        .filter(Deck.user_id == user.id)
        .options(contains_eager(Card.deck))
    )

    if deck_id:
        query = query.filter(Card.deck_id == deck_id)

    if exclude_paused:
        query = query.filter(Deck.is_paused == False)

    if exclude_archived:
        query = query.filter(Deck.is_archived == False)

    today_start = None
    if review_session:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )

        cards_reviewed_today = (
            db_session.query(Review.card_id)
            .filter(Review.user_id == user.id)
            .filter(Review.reviewed_at >= today_start)
            .distinct()
            .subquery()
        )

        query = query.filter(
            or_(
                Card.next_review_date <= today_start,
                Card.id.in_(db_session.query(cards_reviewed_today.c.card_id)),
            )
        ).order_by(Card.next_review_date)
    elif only_due:
        query = query.filter(
            Card.next_review_date <= datetime.now(timezone.utc)
        ).order_by(Card.next_review_date)
    else:
        query = query.order_by(Card.created_at.desc())

    cards = query.all()

    if review_session:
        todays_card_ids = [card.id for card in cards]

        if todays_card_ids:
            todays_reviews = (
                db_session.query(Review)
                .filter(Review.user_id == user.id)
                .filter(Review.card_id.in_(todays_card_ids))
                .filter(Review.reviewed_at >= today_start)
                .order_by(Review.reviewed_at)
                .all()
            )

            reviews_by_card = {}
            for review in todays_reviews:
                if review.card_id not in reviews_by_card:
                    reviews_by_card[review.card_id] = []
                reviews_by_card[review.card_id].append(review)

            return [
                CardOut.from_card(card, todays_reviews=reviews_by_card.get(card.id))
                for card in cards
            ]

    return [CardOut.from_card(card) for card in cards]


@router.patch("/{card_id}", response_model=CardOut)
def update_card(
    card_id: UUID,
    card_req: CardUpdate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    card = get_user_card(card_id, user.id, db_session)
    updates = card_req.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(card, field, value)
    card.save(db_session)
    return CardOut.from_card(card)


@router.delete("/{card_id}")
def delete_card(
    card_id: UUID,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    card = get_user_card(card_id, user.id, db_session)
    card.delete(db_session)
    return {"id": card.id}
