from collections import defaultdict
from datetime import datetime, timedelta
from enum import StrEnum
from typing import List

from src.db.models import Deck, Review
from src.schemas.statistics import DeckStatistics


class DifficultyRankings(StrEnum):
    MASTERED = "mastered"
    CHALLENGING = "challenging"
    LEARNING = "learning"
    NEW = "new"


def calculate_daily_reviews(review_dates: List[datetime]):
    daily_reviews = defaultdict(int)
    for dt in review_dates:
        date_str = dt.date().isoformat()
        daily_reviews[date_str] += 1
    return daily_reviews


def calculate_streak(start: datetime, dates: list[datetime]) -> int:
    seen = set(d.date() for d in dates)
    streak = 0
    current = start.date()

    # The start day may or may not be in dates, but don't penalize the streak if it isn't
    if current not in seen:
        current -= timedelta(days=1)
    else:
        streak += 1
        current -= timedelta(days=1)

    while current in seen:
        streak += 1
        current -= timedelta(days=1)

    return streak


def calculate_retention_rate(
    reviews: List[Review], mature_interval_threshold: int = 21
) -> float:
    mature_reviews = [
        review for review in reviews if review.interval >= mature_interval_threshold
    ]

    if not mature_reviews:
        return 0.0

    correct_mature_reviews = sum(1 for review in mature_reviews if review.succeeded)
    return correct_mature_reviews / len(mature_reviews)


def calculate_success_rate(reviews: List[Review]) -> float:
    if not reviews:
        return 0.0

    valid_reviews = [r for r in reviews if r.succeeded or r.failed]
    if not valid_reviews:
        return 0.0

    correct_reviews = sum(1 for review in valid_reviews if review.succeeded)
    return correct_reviews / len(valid_reviews)


def classify_deck_difficulty(reviews: List[Review]) -> str:
    if len(reviews) < 5:
        return DifficultyRankings.NEW

    success_rate = calculate_success_rate(reviews)
    retention_rate = calculate_retention_rate(reviews)

    recent_reviews = reviews[-10:] if len(reviews) >= 10 else reviews
    recent_success_rate = calculate_success_rate(recent_reviews)

    if success_rate >= 0.85 and retention_rate >= 0.80 and recent_success_rate >= 0.80:
        return DifficultyRankings.MASTERED
    elif success_rate <= 0.60 or retention_rate <= 0.50 or recent_success_rate <= 0.60:
        return DifficultyRankings.CHALLENGING
    else:
        return DifficultyRankings.LEARNING


def get_deck_statistics(deck: Deck, user_reviews: List[Review]) -> DeckStatistics:
    deck_reviews = [review for review in user_reviews if review.deck_id == deck.id]

    if not deck_reviews:
        return DeckStatistics(
            deck_id=str(deck.id),
            deck_name=deck.name,
            deck_path=deck.path,
            retention_rate="{:.2f}".format(0.0),
            total_reviews=0,
            last_studied=None,
            difficulty_ranking=DifficultyRankings.NEW,
        )

    retention_rate = calculate_retention_rate(deck_reviews)
    total_reviews = len(deck_reviews)
    last_studied = max(review.reviewed_at for review in deck_reviews)
    difficulty_ranking = classify_deck_difficulty(deck_reviews)

    return DeckStatistics(
        deck_id=str(deck.id),
        deck_name=deck.name,
        deck_path=deck.path,
        retention_rate="{:.2f}".format(retention_rate),
        total_reviews=total_reviews,
        last_studied=last_studied,
        difficulty_ranking=difficulty_ranking,
    )
