from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

from src.db.models import ReviewFeedback
from src.util import to_start_of_day


@dataclass
class ScheduleResult:
    interval: int
    ease_factor: float
    repetitions: int
    due_date: datetime

    def __post_init__(self):
        self.due_date = to_start_of_day(self.due_date)


class Scheduler(ABC):
    @abstractmethod
    def schedule(
        self,
        feedback: ReviewFeedback,
        repetitions: int,
        ease_factor: float,
        interval: int,
    ) -> ScheduleResult:
        pass
