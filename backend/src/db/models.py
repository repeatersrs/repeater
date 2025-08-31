import uuid
from datetime import datetime, timezone
from enum import StrEnum

import bcrypt
from sqlalchemy import UUID, Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Session, mapped_column, relationship

from src.const import SCHEDULE_DEFAULT_EASE_FACTOR


class Base(DeclarativeBase):
    pass


class BaseMixin:
    id = mapped_column((UUID(as_uuid=True)), primary_key=True, default=uuid.uuid4)
    created_at = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def save(self, db: Session):
        db.add(self)
        db.commit()
        db.refresh(self)
        return self

    def delete(self, db: Session):
        db.delete(self)
        db.commit()

    @classmethod
    def get(cls, db: Session, id: UUID):
        return db.get(cls, id)

    @classmethod
    def all(cls, db: Session):
        return db.query(cls).all()

    @classmethod
    def filter_by(cls, db: Session, **kwargs):
        return db.query(cls).filter_by(**kwargs)


class UserRole(StrEnum):
    GUEST = "guest"
    USER = "user"
    ADMIN = "admin"


class ReviewFeedback(StrEnum):
    OK = "ok"
    SKIPPED = "skipped"
    FORGOT = "forgot"


class AuthProviders(StrEnum):
    GOOGLE = "google"
    PASSWORD = "password"


class User(Base, BaseMixin):
    __tablename__ = "users"

    email = mapped_column(String, unique=True)
    password_hash = mapped_column(String)
    role = mapped_column(String, nullable=False)
    auth_provider = mapped_column(
        String, default=AuthProviders.PASSWORD, nullable=False
    )
    token_version = mapped_column(Integer, default=0, nullable=False)

    decks = relationship("Deck", back_populates="user")
    reviews = relationship("Review", back_populates="user")

    def set_password(self, password: str):
        pw_bytes = password.encode("utf-8")
        pw_hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")
        self.password_hash = pw_hashed

    def promote_to_user(
        self,
        email: str,
        password: str | None = None,
        auth_provider: str = AuthProviders.PASSWORD,
    ):
        assert self.role == UserRole.GUEST, "Cannot promote non-guest"
        if password is not None and auth_provider != AuthProviders.PASSWORD:
            raise ValueError("Can't set password without auth_provider=password")
        self.email = email
        self.auth_provider = auth_provider
        if password is not None:
            self.set_password(password)
        self.role = UserRole.USER
        self.token_version += 1  # Invalidate refresh tokens

    @property
    def is_guest(self):
        return self.role == UserRole.GUEST

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN


class Deck(Base, BaseMixin):
    __tablename__ = "decks"

    user_id = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id = mapped_column(UUID(as_uuid=True), ForeignKey("decks.id"), nullable=True)
    name = mapped_column(String, nullable=False)
    description = mapped_column(String)
    is_paused = mapped_column(Boolean, default=False, nullable=False)
    is_archived = mapped_column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="decks")
    parent = relationship(
        "Deck", remote_side=lambda: [Deck.id], back_populates="children"
    )
    children = relationship("Deck", back_populates="parent")
    cards = relationship("Card", back_populates="deck", cascade="all, delete-orphan")

    @property
    def is_root(self):
        return self.parent_id is None

    @property
    def path(self):
        if self.is_root:
            return [self.name]
        path_parts = []
        current = self
        while current is not None:
            path_parts.append(current.name)
            current = current.parent
        return list(reversed(path_parts))


class Card(Base, BaseMixin):
    __tablename__ = "cards"

    deck_id = mapped_column(
        (UUID(as_uuid=True)), ForeignKey("decks.id"), nullable=False
    )
    content = mapped_column(String)
    next_review_date = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    deck = relationship("Deck", back_populates="cards")


class Review(Base, BaseMixin):
    __tablename__ = "reviews"

    card_id = mapped_column((UUID(as_uuid=True)), nullable=False)
    deck_id = mapped_column((UUID(as_uuid=True)), nullable=False)
    user_id = mapped_column(
        (UUID(as_uuid=True)), ForeignKey("users.id"), nullable=False
    )
    reviewed_at = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    card_content = mapped_column(String)
    deck_name = mapped_column(String, nullable=False)
    feedback = mapped_column(String, nullable=False)
    interval = mapped_column(Integer, nullable=False)
    repetitions = mapped_column(Integer, nullable=False)
    ease_factor = mapped_column(
        Float, default=SCHEDULE_DEFAULT_EASE_FACTOR, nullable=False
    )

    user = relationship("User", back_populates="reviews")

    @property
    def succeeded(self):
        return self.feedback in {ReviewFeedback.OK}

    @property
    def failed(self):
        return self.feedback in {ReviewFeedback.FORGOT}
