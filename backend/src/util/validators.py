from typing import Annotated, Any

from pydantic import BeforeValidator


def strip_string(v: Any) -> Any:
    return v.strip() if isinstance(v, str) else v


StrippedStr = Annotated[str, BeforeValidator(strip_string)]
