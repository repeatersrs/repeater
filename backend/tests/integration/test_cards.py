import uuid
from datetime import datetime, timedelta, timezone

from freezegun import freeze_time

from src.db.models import Card
from tests.asserts import is_utc_isoformat_string, is_uuid_string
from tests.util import create_card, create_deck


async def test_create_card_returns_card(db_session, user, user_client):
    res = await create_deck(user_client)
    deck_id = res.json()["id"]

    res = await create_card(user_client, deck_id)
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "deck_id": deck_id,
        "deck_name": "deck",
        "content": "Test card",
        "next_review_date": is_utc_isoformat_string(),
        "overdue": False,
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }

    card = Card.filter_by(db_session, deck_id=deck_id).first()
    assert card is not None


async def test_create_card_wrong_user_returns_404(user, admin_client, user_client):
    res = await create_deck(admin_client)
    deck_id = res.json()["id"]

    res = await create_card(user_client, deck_id)
    assert res.status_code == 404
    assert res.json()["detail"] == "Resource not found or access denied"


async def test_create_card_deck_doesnt_exist_returns_404(user, user_client):
    res = await create_card(user_client, str(uuid.uuid4()))
    assert res.status_code == 404
    assert res.json()["detail"] == "Resource not found or access denied"


async def test_get_cards(user, user_client):
    res = await create_deck(user_client)
    deck_id = res.json()["id"]

    for i in range(5):
        await create_card(user_client, deck_id, f"Test card {i + 1}")

    res = await user_client.get("/cards")
    assert res.status_code == 200
    assert res.json() == [
        {
            "id": is_uuid_string(),
            "deck_id": deck_id,
            "deck_name": "deck",
            "content": "Test card 5",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
        {
            "id": is_uuid_string(),
            "deck_id": deck_id,
            "deck_name": "deck",
            "content": "Test card 4",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
        {
            "id": is_uuid_string(),
            "deck_id": deck_id,
            "deck_name": "deck",
            "content": "Test card 3",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
        {
            "id": is_uuid_string(),
            "deck_id": deck_id,
            "deck_name": "deck",
            "content": "Test card 2",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
        {
            "id": is_uuid_string(),
            "deck_id": deck_id,
            "deck_name": "deck",
            "content": "Test card 1",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]


async def test_get_cards_by_deck(db_session, user, user_client):
    res = await create_deck(user_client)
    deck_1_id = res.json()["id"]

    res = await create_card(user_client, deck_1_id)
    card_1_id = res.json()["id"]

    res = await create_deck(user_client)
    deck_2_id = res.json()["id"]

    await create_card(user_client, deck_2_id)

    res = await user_client.get("/cards", params={"deck_id": deck_1_id})
    assert res.json() == [
        {
            "id": card_1_id,
            "deck_id": deck_1_id,
            "deck_name": "deck",
            "content": "Test card",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]


async def test_get_due_cards(db_session, user, user_client):
    res = await create_deck(user_client)
    deck_1_id = res.json()["id"]

    res = await create_card(user_client, deck_1_id, "Test card 1")
    card_1_id = res.json()["id"]

    res = await create_deck(user_client)
    deck_2_id = res.json()["id"]

    res = await create_card(user_client, deck_2_id, "Test card 2")
    card_2_id = res.json()["id"]

    # Cards should be scheduled for review as soon as they're created
    res = await user_client.get("/cards", params={"only_due": True})
    assert res.json() == [
        {
            "id": card_1_id,
            "deck_id": deck_1_id,
            "deck_name": "deck",
            "content": "Test card 1",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
        {
            "id": card_2_id,
            "deck_id": deck_2_id,
            "deck_name": "deck",
            "content": "Test card 2",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]

    # Move first card up 1 day, no longer due
    card = Card.get(db_session, card_1_id)
    card.next_review_date = datetime.now(timezone.utc) + timedelta(days=1)
    card.save(db_session)

    res = await user_client.get("/cards", params={"only_due": True})
    assert res.json() == [
        {
            "id": card_2_id,
            "deck_id": deck_2_id,
            "deck_name": "deck",
            "content": "Test card 2",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]

    # Move second card up, nothing is due
    card = Card.get(db_session, card_2_id)
    card.next_review_date = datetime.now(timezone.utc) + timedelta(days=1)
    card.save(db_session)

    res = await user_client.get("/cards", params={"only_due": True})
    assert res.json() == []


@freeze_time("2025-07-12 12:00:00")
async def test_get_overdue_cards(ignore_jwt_expiration, db_session, user, user_client):
    res = await create_deck(user_client)
    deck_id = res.json()["id"]

    res = await create_card(user_client, deck_id)
    card_id = res.json()["id"]

    # Card should be due but not overdue when just created
    res = await user_client.get("/cards", params={"only_due": True})
    assert res.json() == [
        {
            "id": card_id,
            "deck_id": deck_id,
            "deck_name": "deck",
            "content": "Test card",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]

    # Move time forward 1 day, card should now be overdue
    with freeze_time("2025-07-13 12:00:00"):
        res = await user_client.get("/cards", params={"only_due": True})
        assert res.json() == [
            {
                "id": card_id,
                "deck_id": deck_id,
                "deck_name": "deck",
                "content": "Test card",
                "next_review_date": is_utc_isoformat_string(),
                "overdue": True,
                "created_at": is_utc_isoformat_string(),
                "updated_at": is_utc_isoformat_string(),
            },
        ]


async def test_update_card(user, user_client):
    res = await create_deck(user_client)

    deck_id = res.json()["id"]
    res = await create_card(user_client, deck_id)
    card_id = res.json()["id"]
    res = await user_client.patch(
        f"/cards/{card_id}",
        json={
            "content": "Updated card",
        },
    )
    assert res.json() == {
        "id": is_uuid_string(),
        "deck_id": deck_id,
        "deck_name": "deck",
        "content": "Updated card",
        "next_review_date": is_utc_isoformat_string(),
        "overdue": False,
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }


async def test_delete_card(db_session, user, user_client):
    res = await create_deck(user_client)

    deck_id = res.json()["id"]
    res = await create_card(user_client, deck_id)
    card_id = res.json()["id"]
    res = await user_client.delete(
        f"/cards/{card_id}",
    )
    assert res.json()["id"] == card_id

    cards = Card.filter_by(db_session, deck_id=deck_id).all()
    assert cards == []


async def test_delete_deck_deletes_all_cards_in_deck(db_session, user, user_client):
    res = await create_deck(user_client)

    deck_id = res.json()["id"]
    await create_card(user_client, deck_id)
    res = await user_client.delete(f"/decks/{deck_id}")
    assert res.status_code == 200

    cards = Card.filter_by(db_session, deck_id=deck_id).all()
    assert cards == []


async def test_get_due_cards_exclude_archived_decks(db_session, user, user_client):
    res = await create_deck(user_client)
    deck_1_id = res.json()["id"]

    res = await create_card(user_client, deck_1_id, "Test card 1")

    res = await create_deck(user_client, name="deck 2")
    deck_2_id = res.json()["id"]

    res = await create_card(user_client, deck_2_id, "Test card 2")
    card_2_id = res.json()["id"]

    res = await user_client.patch(f"/decks/{deck_1_id}", json={"is_archived": True})
    assert res.status_code == 200

    res = await user_client.get("/cards", params={"exclude_archived": True})
    assert res.json() == [
        {
            "id": card_2_id,
            "deck_id": deck_2_id,
            "deck_name": "deck 2",
            "content": "Test card 2",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        }
    ]


async def test_get_due_cards_exclude_paused_decks(db_session, user, user_client):
    res = await create_deck(user_client)
    deck_1_id = res.json()["id"]

    res = await create_card(user_client, deck_1_id, "Test card 1")

    res = await create_deck(user_client, name="deck 2")
    deck_2_id = res.json()["id"]

    res = await create_card(user_client, deck_2_id, "Test card 2")
    card_2_id = res.json()["id"]

    res = await user_client.patch(f"/decks/{deck_1_id}", json={"is_paused": True})
    assert res.status_code == 200

    res = await user_client.get("/cards", params={"exclude_paused": True})
    assert res.json() == [
        {
            "id": card_2_id,
            "deck_id": deck_2_id,
            "deck_name": "deck 2",
            "content": "Test card 2",
            "next_review_date": is_utc_isoformat_string(),
            "overdue": False,
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        }
    ]


async def test_get_cards_exclude_paused_parent(user, user_client):
    deck_to_pause = await create_deck(user_client)
    deck_to_pause_id = deck_to_pause.json()["id"]
    child_deck = await create_deck(user_client, parent_id=deck_to_pause_id)
    child_deck_id = child_deck.json()["id"]

    res = await create_card(user_client, child_deck_id)

    res = await user_client.patch(
        f"/decks/{deck_to_pause_id}", json={"is_paused": True}
    )

    res = await user_client.get("/cards?exclude_paused=true")
    assert res.status_code == 200
    assert res.json() == []


async def test_get_cards_exclude_archived_parent(user, user_client):
    deck_to_archive = await create_deck(user_client)
    deck_to_archive_id = deck_to_archive.json()["id"]
    child_deck = await create_deck(user_client, parent_id=deck_to_archive_id)
    child_deck_id = child_deck.json()["id"]

    res = await create_card(user_client, child_deck_id)

    res = await user_client.patch(
        f"/decks/{deck_to_archive_id}", json={"is_archived": True}
    )

    res = await user_client.get("/cards?exclude_archived=true")
    assert res.status_code == 200
    assert res.json() == []
