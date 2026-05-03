from datetime import datetime, timedelta

from src.api.reviews import get_scheduler
from src.db.models import Card, Review, ReviewFeedback
from src.main import app
from src.schedulers.basic import BasicScheduler
from tests.asserts import is_utc_isoformat_string, is_uuid_string
from tests.util import create_card, create_deck, create_review


async def test_create_review(db_session, user, user_client):
    app.dependency_overrides[get_scheduler] = lambda: BasicScheduler()

    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_id, "content": "Test card"}
    )
    assert res.status_code == 201
    card_id = res.json()["id"]

    # 1st review
    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.OK,
        },
    )
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "card_id": card_id,
        "deck_id": deck_id,
        "user_id": is_uuid_string(),
        "reviewed_at": is_utc_isoformat_string(),
        "card_content": "Test card",
        "deck_name": "deck",
        "feedback": ReviewFeedback.OK,
        "interval": 1,
        "repetitions": 1,
        "ease_factor": 2.65,
        "created_at": is_utc_isoformat_string(),
        "succeeded": True,
        "failed": False,
    }

    reviewed_at = res.json()["reviewed_at"]
    interval = res.json()["interval"]
    due_date = datetime.fromisoformat(reviewed_at).date() + timedelta(days=interval)

    card = Card.get(db_session, card_id)
    assert card is not None
    assert card.due_date.date() == due_date

    # 2nd review
    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.OK,
        },
    )
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "card_id": card_id,
        "deck_id": deck_id,
        "user_id": is_uuid_string(),
        "reviewed_at": is_utc_isoformat_string(),
        "card_content": "Test card",
        "deck_name": "deck",
        "feedback": ReviewFeedback.OK,
        "interval": 5,
        "repetitions": 2,
        "ease_factor": 2.80,
        "created_at": is_utc_isoformat_string(),
        "succeeded": True,
        "failed": False,
    }

    reviewed_at = res.json()["reviewed_at"]
    interval = res.json()["interval"]
    due_date = datetime.fromisoformat(reviewed_at).date() + timedelta(days=interval)

    card = Card.get(db_session, card_id)
    assert card is not None
    assert card.due_date.date() == due_date
    assert len(Review.all(db_session)) == 2

    app.dependency_overrides.clear()


async def test_create_review_other_user_card_returns_404(
    db_session, user, admin, admin_client, user_client
):
    res = await admin_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await admin_client.post(
        "/cards", json={"deck_id": deck_id, "content": "Test card"}
    )
    assert res.status_code == 201
    card_id = res.json()["id"]

    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.OK,
        },
    )
    assert res.status_code == 404


async def test_create_review_skipped(db_session, user, user_client):
    app.dependency_overrides[get_scheduler] = lambda: BasicScheduler()

    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_id, "content": "Test card"}
    )
    assert res.status_code == 201
    card_id = res.json()["id"]

    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.SKIPPED,
        },
    )
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "card_id": card_id,
        "deck_id": deck_id,
        "user_id": is_uuid_string(),
        "reviewed_at": is_utc_isoformat_string(),
        "card_content": "Test card",
        "deck_name": "deck",
        "feedback": ReviewFeedback.SKIPPED,
        "interval": 1,
        "repetitions": 0,
        "ease_factor": 2.5,
        "created_at": is_utc_isoformat_string(),
        "succeeded": False,
        "failed": False,
    }

    reviewed_at = res.json()["reviewed_at"]
    interval = res.json()["interval"]
    due_date = datetime.fromisoformat(reviewed_at).date() + timedelta(days=interval)

    card = Card.get(db_session, card_id)
    assert card is not None
    assert card.due_date.date() == due_date

    app.dependency_overrides.clear()


async def test_create_review_forgot(db_session, user, user_client):
    app.dependency_overrides[get_scheduler] = lambda: BasicScheduler()

    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_id, "content": "Test card"}
    )
    assert res.status_code == 201
    card_id = res.json()["id"]

    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.FORGOT,
        },
    )
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "card_id": card_id,
        "deck_id": deck_id,
        "user_id": is_uuid_string(),
        "reviewed_at": is_utc_isoformat_string(),
        "card_content": "Test card",
        "deck_name": "deck",
        "feedback": ReviewFeedback.FORGOT,
        "interval": 1,
        "repetitions": 0,
        "ease_factor": 2.3,
        "created_at": is_utc_isoformat_string(),
        "succeeded": False,
        "failed": True,
    }

    reviewed_at = res.json()["reviewed_at"]
    interval = res.json()["interval"]
    due_date = datetime.fromisoformat(reviewed_at).date() + timedelta(days=interval)

    card = Card.get(db_session, card_id)
    assert card is not None
    assert card.due_date.date() == due_date

    app.dependency_overrides.clear()


async def test_get_review_history(user, user_client):
    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    deck_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_id, "content": "Test card"}
    )
    card_id = res.json()["id"]

    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.FORGOT,
        },
    )

    res = await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.OK,
        },
    )

    # Reviews should be ordered in descending order based on reviewed_at
    res = await user_client.get(f"/reviews/{card_id}")
    assert res.json() == [
        {
            "id": is_uuid_string(),
            "card_id": card_id,
            "deck_id": deck_id,
            "user_id": is_uuid_string(),
            "reviewed_at": is_utc_isoformat_string(),
            "card_content": "Test card",
            "deck_name": "deck",
            "feedback": ReviewFeedback.OK,
            "interval": 1,
            "repetitions": 1,
            "ease_factor": 2.45,
            "created_at": is_utc_isoformat_string(),
            "succeeded": True,
            "failed": False,
        },
        {
            "id": is_uuid_string(),
            "card_id": card_id,
            "deck_id": deck_id,
            "user_id": is_uuid_string(),
            "reviewed_at": is_utc_isoformat_string(),
            "card_content": "Test card",
            "deck_name": "deck",
            "feedback": ReviewFeedback.FORGOT,
            "interval": 1,
            "repetitions": 0,
            "ease_factor": 2.3,
            "created_at": is_utc_isoformat_string(),
            "succeeded": False,
            "failed": True,
        },
    ]


async def test_session_undo_latest_review_restores_card_and_hides_review(
    db_session, user_client
):
    deck = await create_deck(user_client)
    card = await create_card(user_client, deck.json()["id"])
    card_id = card.json()["id"]
    original_due_date = Card.get(db_session, card_id).due_date

    review = await create_review(user_client, card_id, ReviewFeedback.OK)
    review_id = review.json()["id"]

    res = await user_client.post("/review-session/undo")
    assert res.status_code == 200

    db_session.refresh(Card.get(db_session, card_id))
    assert Card.get(db_session, card_id).due_date == original_due_date

    history = await user_client.get(f"/reviews/{card_id}")
    assert history.json() == []

    undone_review = Review.get(db_session, review_id)
    assert undone_review.undone_at is not None


async def test_session_undo_review_without_previous_due_date_returns_409(
    db_session, user_client
):
    deck = await create_deck(user_client)
    card = await create_card(user_client, deck.json()["id"])
    card_id = card.json()["id"]

    review = await create_review(user_client, card_id, ReviewFeedback.OK)
    review_id = review.json()["id"]
    reviewed_due_date = Card.get(db_session, card_id).due_date

    review_model = Review.get(db_session, review_id)
    review_model.previous_due_date = None
    db_session.commit()

    res = await user_client.post("/review-session/undo")
    assert res.status_code == 409

    card_model = Card.get(db_session, card_id)
    db_session.refresh(card_model)
    assert card_model.due_date == reviewed_due_date
    assert Review.get(db_session, review_id).undone_at is None


async def test_session_undo_returns_409_when_nothing_to_undo(user_client):
    res = await user_client.post("/review-session/undo")
    assert res.status_code == 409


async def test_redo_must_follow_session_history_order(db_session, user_client):
    deck = await create_deck(user_client)
    card = await create_card(user_client, deck.json()["id"])
    card_id = card.json()["id"]

    first = await create_review(user_client, card_id, ReviewFeedback.FORGOT)
    second = await create_review(user_client, card_id, ReviewFeedback.OK)
    first_id = first.json()["id"]
    second_id = second.json()["id"]

    await user_client.post("/review-session/undo")
    await user_client.post("/review-session/undo")

    res = await user_client.post("/review-session/redo")
    assert res.status_code == 200
    assert Review.get(db_session, first_id).undone_at is None
    assert Review.get(db_session, second_id).undone_at is not None

    res = await user_client.post("/review-session/redo")
    assert res.status_code == 200
    assert Review.get(db_session, second_id).undone_at is None


async def test_new_review_after_undo_discards_redo_tail(db_session, user_client):
    deck = await create_deck(user_client)
    card = await create_card(user_client, deck.json()["id"])
    card_id = card.json()["id"]

    undone = await create_review(user_client, card_id, ReviewFeedback.FORGOT)
    undone_id = undone.json()["id"]
    await user_client.post("/review-session/undo")

    replacement = await create_review(user_client, card_id, ReviewFeedback.OK)
    assert replacement.status_code == 201
    assert Review.get(db_session, undone_id) is None

    res = await user_client.post("/review-session/redo")
    assert res.status_code == 409


async def test_other_user_cannot_undo_review(admin_client, user_client):
    deck = await create_deck(admin_client)
    card = await create_card(admin_client, deck.json()["id"])
    await create_review(admin_client, card.json()["id"], ReviewFeedback.OK)

    res = await user_client.post("/review-session/undo")
    assert res.status_code == 409
