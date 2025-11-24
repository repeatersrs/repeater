from src.db.models import ReviewFeedback
from tests.util import create_card, create_deck, create_review


async def test_review_session_not_started(user_client):
    """Test review session with no cards reviewed."""
    deck = await create_deck(user_client)
    deck_id = deck.json()["id"]

    for i in range(5):
        await create_card(user_client, deck_id, f"Test card {i + 1}")

    session = await user_client.get("/review-session")
    data = session.json()

    assert "date" in data
    assert len(data["remaining"]) == 5
    assert len(data["completed"]) == 0
    assert len(data["failed"]) == 0

    assert all(card["todays_reviews"] == [] for card in data["remaining"])


async def test_review_session_with_reviews(user_client):
    """Test that cards are correctly categorized after review."""
    deck = await create_deck(user_client)
    deck_id = deck.json()["id"]

    cards = []
    for i in range(5):
        card = await create_card(user_client, deck_id, f"Card {i + 1}")
        cards.append(card.json())

    await create_review(user_client, cards[0]["id"], ReviewFeedback.OK)
    await create_review(user_client, cards[1]["id"], ReviewFeedback.OK)
    await create_review(user_client, cards[2]["id"], ReviewFeedback.FORGOT)
    await create_review(user_client, cards[3]["id"], ReviewFeedback.FORGOT)

    session = await user_client.get("/review-session")
    data = session.json()

    assert len(data["remaining"]) == 1
    assert len(data["completed"]) == 2
    assert len(data["failed"]) == 2

    assert all(
        any(review["feedback"] == "ok" for review in card["todays_reviews"])
        for card in data["completed"]
    )

    assert all(
        all(review["feedback"] == "forgot" for review in card["todays_reviews"])
        for card in data["failed"]
    )


async def test_review_session_failed_then_completed(user_client):
    """Test that a card moves from failed to completed after correct review."""
    deck = await create_deck(user_client)
    deck_id = deck.json()["id"]

    card = await create_card(user_client, deck_id, "Card 1")
    card_id = card.json()["id"]

    await create_review(user_client, card_id, ReviewFeedback.FORGOT)

    session1 = await user_client.get("/review-session")
    assert len(session1.json()["failed"]) == 1
    assert len(session1.json()["completed"]) == 0

    await create_review(user_client, card_id, ReviewFeedback.OK)

    session2 = await user_client.get("/review-session")
    assert len(session2.json()["failed"]) == 0
    assert len(session2.json()["completed"]) == 1

    completed_card = session2.json()["completed"][0]
    assert len(completed_card["todays_reviews"]) == 2
    assert completed_card["todays_reviews"][0]["feedback"] == "forgot"
    assert completed_card["todays_reviews"][1]["feedback"] == "ok"
