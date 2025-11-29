from datetime import datetime


def to_start_of_day(dt: datetime):
    return datetime.combine(dt.date(), datetime.min.time())
