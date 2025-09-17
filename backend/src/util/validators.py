from typing import Annotated

from pydantic import BeforeValidator


def strip_comprehensive(v):
    if isinstance(v, str):
        # Remove invisible characters
        invisible_chars = "\u200b\u200c\u200d\ufeff\u00a0"
        for char in invisible_chars:
            v = v.replace(char, "")
        return v.strip()
    return v


StrippedStr = Annotated[str, BeforeValidator(strip_comprehensive)]
