from uuid import UUID

from fastapi import Request
from sqlalchemy.orm import Session, contains_eager

from src.auth.jwt import decode_jwt
from src.db.models import Card, Deck, User, UserRole


def add_user(email: str, password: str, role: UserRole, db_session: Session) -> User:
    user = User(email=email, role=role)
    user.set_password(password)
    user = user.save(db_session)
    return user


def get_user_card(card_id: UUID, user_id: UUID, db_session: Session) -> Card:
    return (
        db_session.query(Card)
        .join(Deck)
        .filter(Card.id == card_id, Deck.user_id == user_id)
        .options(contains_eager(Card.deck))
        .one()
    )


def get_user_from_token(request: Request, db_session: Session) -> User | None:
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = decode_jwt(token)
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = User.get(db_session, user_id)
        return user
    except Exception:
        return None


def would_create_cycle(parent_id: UUID, new_parent: Deck) -> bool:
    current = new_parent
    while current:
        if current.id == parent_id:
            return True
        current = current.parent
    return False


def get_depth_to_root(deck: Deck) -> int:
    depth = 0
    current = deck
    while current.parent_id:
        current = current.parent
        depth += 1
    return depth


def get_depth_below(deck: Deck) -> int:
    depth = 0

    def traverse(deck: Deck, current_depth: int):
        nonlocal depth
        depth = max(depth, current_depth)

        for child in deck.children:
            traverse(child, current_depth + 1)

    traverse(deck, 0)
    return depth


def set_children_paused(deck: Deck, db_session: Session):
    def traverse_and_pause(deck: Deck):
        deck.is_paused = True
        deck.save(db_session)
        for child in deck.children:
            traverse_and_pause(child)

    traverse_and_pause(deck)


def set_children_archived(deck: Deck, db_session: Session):
    def traverse_and_archive(deck: Deck):
        deck.is_archived = True
        deck.save(db_session)
        for child in deck.children:
            traverse_and_archive(child)

    traverse_and_archive(deck)
