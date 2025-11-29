import logging

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.auth.jwt import (
    create_access_token,
    create_refresh_token,
    decode_jwt,
    get_access_token_cookie_kwargs,
    get_refresh_token_cookie_kwargs,
    get_user_from_token,
)
from src.db import get_db
from src.db.models import User, UserRole
from src.exceptions import RefreshTokenAuthenticationError
from src.schemas.user import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", status_code=204)
def login(
    user_req: UserLogin, response: Response, db_session: Session = Depends(get_db)
):
    user = User.filter_by(db_session, email=user_req.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if user.password_hash is None:
        auth_provider = user.auth_provider
        assert auth_provider is not None, (
            "Missing auth_provider with null password_hash"
        )
        raise HTTPException(
            status_code=403,
            detail=f"This account was created via {auth_provider.title()}. Please use that provider to sign in.",
        )

    pw_bytes = user_req.password.encode("utf-8")
    pw_hashed = user.password_hash.encode("utf-8")
    if not bcrypt.checkpw(pw_bytes, pw_hashed):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    logging.info(f"User {user.email} logged in")

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    response.set_cookie(**get_access_token_cookie_kwargs(access_token))
    response.set_cookie(**get_refresh_token_cookie_kwargs(refresh_token))
    return


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return


@router.post("/register", response_model=UserOut, status_code=201)
def register(
    user_req: UserCreate, request: Request, db_session: Session = Depends(get_db)
):
    if User.filter_by(db_session, email=user_req.email).first():
        raise HTTPException(status_code=400, detail="Email is in use")

    user = get_user_from_token(request, db_session)
    if user and user.role == UserRole.GUEST:
        user.promote_to_user(user_req.email, user_req.password)
        user.save(db_session)

        logging.info(f"Promoted guest user to {user.email}")
        return user

    user = User(email=user_req.email, role=UserRole.USER)
    user.set_password(user_req.password)
    user.save(db_session)

    logging.info(f"Created user {user.email}")
    return user


@router.post("/refresh", status_code=204)
def refresh_token(
    request: Request,
    response: Response,
    db_session: Session = Depends(get_db),
):
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    try:
        payload = decode_jwt(refresh_token)
        user_id = payload.get("sub")
        token_version = payload.get("token_version")
        if user_id is None or token_version is None:
            raise RefreshTokenAuthenticationError("Invalid refresh token")
        user = User.get(db_session, user_id)
        if not user or user.token_version != token_version:
            raise RefreshTokenAuthenticationError("Invalid refresh token")
    except jwt.ExpiredSignatureError:
        raise RefreshTokenAuthenticationError("Expired refresh token")
    except jwt.InvalidTokenError:
        raise RefreshTokenAuthenticationError("Invalid refresh token")

    access_token = create_access_token(user)
    response.set_cookie(**get_access_token_cookie_kwargs(access_token))
    return
