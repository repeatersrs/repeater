from datetime import datetime

from freezegun import freeze_time

from src.db.models import ReviewFeedback
from src.statistics import DifficultyRankings


@freeze_time("2025-07-01")
async def test_get_statistics(ignore_jwt_expiration, user, user_client):
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

    await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.FORGOT,
        },
    )

    with freeze_time("2025-07-02"):
        await user_client.post(
            "/reviews",
            json={
                "card_id": card_id,
                "feedback": ReviewFeedback.OK,
            },
        )

        res = await user_client.get(
            "/stats",
        )

    assert res.status_code == 200
    assert res.json() == {
        "total_reviews": 2,
        "daily_reviews": {
            "2025-07-01": 1,
            "2025-07-02": 1,
        },
        "success_rate": 0.5,
        "retention_rate": 0,
        "streak": 2,
        "deck_statistics": [
            {
                "deck_id": deck_id,
                "deck_name": "deck",
                "deck_path": ["deck"],
                "retention_rate": 0,
                "total_reviews": 2,
                "last_studied": datetime(2025, 7, 2).isoformat(timespec="seconds")
                + "Z",
                "difficulty_ranking": DifficultyRankings.NEW,
            }
        ],
    }


@freeze_time("2025-07-01")
async def test_get_statistics_different_decks(ignore_jwt_expiration, user, user_client):
    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    deck_1_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_1_id, "content": "Test card"}
    )
    card_1_id = res.json()["id"]

    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    deck_2_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_2_id, "content": "Test card"}
    )
    card_2_id = res.json()["id"]

    with freeze_time("2025-07-02"):
        await user_client.post(
            "/reviews",
            json={
                "card_id": card_1_id,
                "feedback": ReviewFeedback.OK,
            },
        )

        await user_client.post(
            "/reviews",
            json={
                "card_id": card_2_id,
                "feedback": ReviewFeedback.OK,
            },
        )

        res = await user_client.get(
            "/stats",
        )

    assert res.status_code == 200
    assert res.json() == {
        "total_reviews": 2,
        "daily_reviews": {
            "2025-07-02": 2,
        },
        "success_rate": 1,
        "retention_rate": 0,
        "streak": 1,
        "deck_statistics": [
            {
                "deck_id": deck_1_id,
                "deck_name": "deck",
                "deck_path": ["deck"],
                "retention_rate": 0,
                "total_reviews": 1,
                "last_studied": datetime(2025, 7, 2).isoformat(timespec="seconds")
                + "Z",
                "difficulty_ranking": DifficultyRankings.NEW,
            },
            {
                "deck_id": deck_2_id,
                "deck_name": "deck",
                "deck_path": ["deck"],
                "retention_rate": 0,
                "total_reviews": 1,
                "last_studied": datetime(2025, 7, 2).isoformat(timespec="seconds")
                + "Z",
                "difficulty_ranking": DifficultyRankings.NEW,
            },
        ],
    }


@freeze_time("2025-07-01")
async def test_get_statistics_deleted_card(ignore_jwt_expiration, user_client):
    """Deleting a card that has reviews should not impact the statistics"""
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

    await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.OK,
        },
    )

    res = await user_client.get(
        "/stats",
    )
    stats = res.json()
    assert stats == {
        "total_reviews": 1,
        "daily_reviews": {
            "2025-07-01": 1,
        },
        "success_rate": 1,
        "retention_rate": 0,
        "streak": 1,
        "deck_statistics": [
            {
                "deck_id": deck_id,
                "deck_name": "deck",
                "deck_path": ["deck"],
                "retention_rate": 0,
                "total_reviews": 1,
                "last_studied": datetime(2025, 7, 1).isoformat(timespec="seconds")
                + "Z",
                "difficulty_ranking": DifficultyRankings.NEW,
            },
        ],
    }

    res = await user_client.delete(f"/cards/{card_id}")
    assert res.status_code == 200

    res = await user_client.get(
        "/stats",
    )
    assert res.json() == stats


@freeze_time("2025-07-01")
async def test_get_statistics_deleted_deck(ignore_jwt_expiration, user_client):
    """Deleting a deck that has reviews should preserve the overall statistics but remove the statistics for that deck"""
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

    await user_client.post(
        "/reviews",
        json={
            "card_id": card_id,
            "feedback": ReviewFeedback.OK,
        },
    )

    res = await user_client.get(
        "/stats",
    )
    stats = res.json()
    assert stats == {
        "total_reviews": 1,
        "daily_reviews": {
            "2025-07-01": 1,
        },
        "success_rate": 1,
        "retention_rate": 0,
        "streak": 1,
        "deck_statistics": [
            {
                "deck_id": deck_id,
                "deck_name": "deck",
                "deck_path": ["deck"],
                "retention_rate": 0,
                "total_reviews": 1,
                "last_studied": datetime(2025, 7, 1).isoformat(timespec="seconds")
                + "Z",
                "difficulty_ranking": DifficultyRankings.NEW,
            },
        ],
    }

    res = await user_client.delete(f"/decks/{deck_id}")
    assert res.status_code == 200

    res = await user_client.get(
        "/stats",
    )
    assert res.json() == {
        "total_reviews": 1,
        "daily_reviews": {
            "2025-07-01": 1,
        },
        "success_rate": 1,
        "retention_rate": 0,
        "streak": 1,
        "deck_statistics": [],
    }


@freeze_time("2025-07-01")
async def test_get_deck_statistics(ignore_jwt_expiration, user_client):
    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    assert res.status_code == 201
    deck_1_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_1_id, "content": "Test card"}
    )
    card_1_id = res.json()["id"]

    res = await user_client.post(
        "/decks",
        json={
            "name": "deck",
            "description": "my deck",
        },
    )
    assert res.status_code == 201
    deck_2_id = res.json()["id"]

    res = await user_client.post(
        "/cards", json={"deck_id": deck_2_id, "content": "Test card"}
    )

    with freeze_time("2025-07-02"):
        await user_client.post(
            "/reviews",
            json={
                "card_id": card_1_id,
                "feedback": ReviewFeedback.OK,
            },
        )
        assert res.status_code == 201

        res = await user_client.get(
            f"/stats/{deck_1_id}",
        )
        assert res.json() == {
            "deck_id": deck_1_id,
            "deck_name": "deck",
            "deck_path": ["deck"],
            "retention_rate": 0,
            "total_reviews": 1,
            "last_studied": datetime(2025, 7, 2).isoformat(timespec="seconds") + "Z",
            "difficulty_ranking": DifficultyRankings.NEW,
        }

        res = await user_client.get(
            f"/stats/{deck_2_id}",
        )
        assert res.json() == {
            "deck_id": deck_2_id,
            "deck_name": "deck",
            "deck_path": ["deck"],
            "retention_rate": 0,
            "total_reviews": 0,
            "last_studied": None,
            "difficulty_ranking": DifficultyRankings.NEW,
        }
