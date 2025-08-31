from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class DeckCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    parent_id: Optional[UUID] = None


class DeckOut(BaseModel):
    id: UUID
    user_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    description: str
    is_paused: bool
    is_archived: bool
    is_root: bool
    path: List[str]
    created_at: datetime
    updated_at: datetime


class DeckUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = ""
    parent_id: Optional[UUID] = None
    is_paused: Optional[bool] = None
    is_archived: Optional[bool] = None


class DeckSummary(BaseModel):
    id: UUID
    name: str


class DeckNode(BaseModel):
    id: UUID
    name: str
    children: List["DeckNode"] = []
    card_count: int = 0
    depth: int = 0


class DeckTree(BaseModel):
    decks: List[DeckNode] = []
    total_decks: int = 0
    tree_depth: int = 0
