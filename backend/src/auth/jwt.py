from datetime import datetime, timedelta, timezone
from os import getenv
from uuid import UUID, uuid4

import jwt
from fastapi import Cookie, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from src.db import get_db
from src.db.models import User, UserRole

SECRET_KEY = getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60  # 1 hour
REFRESH_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 10  # 10 days
GUEST_REFRESH_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 30  # 30 days


# TODO change the secure flag to True in production
def get_access_token_cookie_kwargs(
    access_token: str, exp_delta_seconds: int = ACCESS_TOKEN_EXPIRE_SECONDS
) -> dict:
    return dict(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=exp_delta_seconds + 60,  # +1 minute buffer
    )


# TODO change the secure flag to True in production
def get_refresh_token_cookie_kwargs(
    refresh_token: str, exp_delta_seconds: int = REFRESH_TOKEN_EXPIRE_SECONDS
) -> dict:
    return dict(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=exp_delta_seconds + (24 * 60 * 60),  # +1 day buffer
    )


def create_access_token(
    user: User, exp_delta_seconds: int = ACCESS_TOKEN_EXPIRE_SECONDS
) -> str:
    return _create_jwt(
        user.id,
        exp_delta_seconds,
        {"role": user.role, "token_version": user.token_version},
    )


def create_refresh_token(
    user: User, exp_delta_seconds: int = REFRESH_TOKEN_EXPIRE_SECONDS
) -> str:
    return _create_jwt(
        user.id,
        exp_delta_seconds,
        {"jti": str(uuid4()), "token_version": user.token_version},
    )


def _create_jwt(user_id: UUID, exp_delta_seconds: int, data: dict = {}) -> str:
    payload = {
        "sub": str(user_id),
    }

    if data is not None:
        payload.update(data)

    now = datetime.now(timezone.utc)
    expire = now + timedelta(seconds=exp_delta_seconds)

    # Ignore token expiration when testing
    if not getenv("IGNORE_JWT_EXPIRATION"):
        payload.update({"iat": now, "exp": expire})

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def create_guest_user(db_session: Session) -> User:
    user = User(role=UserRole.GUEST)
    user.save(db_session)
    return user


def get_current_user(
    response: Response,
    access_token: str | None = Cookie(default=None),
    refresh_token: str | None = Cookie(default=None),
    db_session: Session = Depends(get_db),
) -> User:
    if access_token is None and refresh_token is None:
        guest_user = create_guest_user(db_session)
        access_token = create_access_token(guest_user)
        refresh_token = create_refresh_token(
            guest_user, GUEST_REFRESH_TOKEN_EXPIRE_SECONDS
        )
        response.set_cookie(**get_access_token_cookie_kwargs(access_token))
        response.set_cookie(
            **get_refresh_token_cookie_kwargs(
                refresh_token, GUEST_REFRESH_TOKEN_EXPIRE_SECONDS
            )
        )
        return guest_user

    if access_token:
        try:
            payload = decode_jwt(access_token)
            user_id = payload.get("sub")
            if user_id:
                user = User.get(db_session, user_id)
                if user:
                    return user
        except jwt.InvalidTokenError:
            pass

    raise HTTPException(status_code=401, detail="Invalid or expired access token")


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
