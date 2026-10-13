"""Shared attendance-status rules used by the bundled plugin runtime."""

from datetime import datetime
from typing import Iterable


LATE_NIGHT_CLOCK_OUT_START = "23:30"
LATE_NIGHT_CLOCK_OUT_END = "23:59"


def is_late_night_completion(clock_in: str, clock_out: str) -> bool:
    """Whether a same-day 23:30-23:59 clock-out completes attendance normally."""
    return bool(
        clock_in
        and clock_out
        and clock_in < LATE_NIGHT_CLOCK_OUT_START
        and LATE_NIGHT_CLOCK_OUT_START <= clock_out <= LATE_NIGHT_CLOCK_OUT_END
    )


def has_late_night_completion(timestamps: Iterable[datetime]) -> bool:
    """Apply the late-night completion rule to raw timestamps from one employee."""
    values = list(timestamps)
    if len(values) < 2:
        return False
    clock_out = max(values)
    if not LATE_NIGHT_CLOCK_OUT_START <= clock_out.strftime("%H:%M") <= LATE_NIGHT_CLOCK_OUT_END:
        return False
    return any(
        value.date() == clock_out.date()
        and value.strftime("%H:%M") < LATE_NIGHT_CLOCK_OUT_START
        for value in values
    )
