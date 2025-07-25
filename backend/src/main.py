from os import getenv

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from src.api import (
    auth,
    cards,
    categories,
    decks,
    healthcheck,
    me,
    oauth,
    reviews,
    statistics,
)
from src.exceptions import RefreshTokenAuthenticationError
from src.log import set_up_logger

load_dotenv()
set_up_logger()

frontend_url = getenv("FRONTEND_URL")
assert frontend_url, "FRONTEND_URL must be set"
origins = [frontend_url]

app = FastAPI()


@app.exception_handler(RefreshTokenAuthenticationError)
async def authentication_error_handler(
    request: Request, exc: RefreshTokenAuthenticationError
):
    response = JSONResponse(status_code=401, content={"detail": exc.detail})
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msg = exc.errors()[0].get("msg")
    return JSONResponse(
        status_code=422,
        content={"detail": error_msg},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=getenv("SECRET_KEY"),
)

app.include_router(auth.router)
app.include_router(decks.router)
app.include_router(cards.router)
app.include_router(oauth.router)
app.include_router(me.router)
app.include_router(reviews.router)
app.include_router(statistics.router)
app.include_router(categories.router)
app.include_router(healthcheck.router)
