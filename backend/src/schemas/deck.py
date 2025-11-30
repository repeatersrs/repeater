from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Self
from uuid import UUID

from pydantic import BaseModel

from src.util.validators import StrippedStr


class DeckCreate(BaseModel):
    name: StrippedStr
    description: Optional[StrippedStr] = ""
    parent_id: Optional[UUID] = None


class DeckOut(BaseModel):
    id: UUID
    user_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    is_paused: bool
    is_archived: bool
    is_root: bool
    path: List[Dict[str, str]]
    created_at: datetime
    updated_at: datetime


class DeckUpdate(BaseModel):
    name: Optional[StrippedStr] = None
    description: Optional[StrippedStr] = ""
    parent_id: Optional[UUID] = None
    is_paused: Optional[bool] = None
    is_archived: Optional[bool] = None


class DeckSummary(BaseModel):
    id: UUID
    name: str


class DeckNode(BaseModel):
    id: UUID
    name: str
    children: List[Self]
    card_count: int
    depth: int
    is_paused: bool


class DeckTree(BaseModel):
    decks: List[DeckNode]
    total_decks: int
    tree_depth: int


class ImportFormat(str, Enum):
    REPEATER = "repeater"
    MOCHI_MARKDOWN = "mochi_markdown"
