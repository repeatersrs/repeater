from datetime import datetime, timedelta, timezone

from src.db.models import ReviewFeedback
from src.schedulers import Scheduler, ScheduleResult


class BasicScheduler(Scheduler):
    def schedule(
        self,
        feedback: ReviewFeedback,
        repetitions: int,
        ease_factor: float,
        interval: int,
    ):
        if feedback == ReviewFeedback.SKIPPED:
            return ScheduleResult(
                interval=interval,
                ease_factor=ease_factor,
                repetitions=repetitions,
                due_date=datetime.now(timezone.utc) + timedelta(days=1),
            )

        if feedback == ReviewFeedback.FORGOT:
            return ScheduleResult(
                interval=1,
                ease_factor=max(1.3, ease_factor - 0.2),
                repetitions=0,
                due_date=datetime.now(timezone.utc) + timedelta(days=1),
            )

        if feedback == ReviewFeedback.OK:
            repetitions += 1
            ease_factor += 0.15
        else:
            raise ValueError(f"Unknown feedback {feedback}")

        if repetitions == 1:
            interval = 1
        elif repetitions == 2:
            interval = 5
        else:
            interval = round(interval * ease_factor)

        return ScheduleResult(
            interval=interval,
            ease_factor=ease_factor,
            repetitions=repetitions,
            due_date=datetime.now(timezone.utc) + timedelta(days=interval),
        )
