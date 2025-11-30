from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel


class DeckStatistics(BaseModel):
    deck_id: str
    deck_name: str
    deck_path: List[Dict[str, str]]
    retention_rate: float
    total_reviews: int
    last_studied: Optional[datetime] = None
    difficulty_ranking: str


class StatisticsOut(BaseModel):
    total_reviews: int
    daily_reviews: Dict[str, int]
    success_rate: float
    retention_rate: float
    streak: int
    deck_statistics: List[DeckStatistics]
