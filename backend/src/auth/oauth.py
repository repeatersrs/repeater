import logging

from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session
from starlette.config import Config

from src.auth.jwt import get_user_from_token
from src.db.models import AuthProviders, User, UserRole

config = Config(".env")
oauth = OAuth(config)
oauth.register(
    name=AuthProviders.GOOGLE,
    client_id=config("GOOGLE_CLIENT_ID"),
    client_secret=config("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


async def get_user_oauth(request, db_session: Session):
    token = await oauth.google.authorize_access_token(request)

    assert "userinfo" in token, "Missing userinfo in token"
    user = token["userinfo"]

    assert "email" in user, "Missing email in userinfo"
    email = user["email"]

    # Case 1, the user making the request has a guest account. Promote the account and return it
    user = get_user_from_token(request, db_session)
    if user and user.role == UserRole.GUEST:
        user.promote_to_user(email, password=None, auth_provider=AuthProviders.GOOGLE)
        user.save(db_session)

        logging.info(f"Promoted guest user to {user.email} via OAuth flow")
        return user

    # Case 2, the user does not have an account yet, create one and return it
    user = User.filter_by(db_session, email=email).first()
    if not user:
        user = User(
            email=email,
            password_hash=None,
            role=UserRole.USER,
            auth_provider=AuthProviders.GOOGLE,
        )
        user.save(db_session)

    # Case 3, the user already exists
    return user
