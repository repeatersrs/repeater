from io import BytesIO
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.auth.jwt import get_current_user
from src.db import get_db
from src.db.models import Deck, User
from src.import_export import (
    BaseImporter,
    deck_to_deck_data,
    export,
    store_imported_deck,
)
from src.import_export.custom import CustomImporter
from src.schemas.deck import DeckCreate, DeckNode, DeckOut, DeckTree, DeckUpdate
from src.util import get_depth_to_root, get_user_deck, would_create_cycle

router = APIRouter(prefix="/decks", tags=["decks"])


@router.post("", response_model=DeckOut, status_code=201)
def create_deck(
    deck_req: DeckCreate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    if deck_req.parent_id:
        try:
            get_user_deck(deck_req.parent_id, user.id, db_session)
        except ValueError as err:
            raise HTTPException(status_code=404, detail=str(err))

    deck = Deck(
        user_id=user.id,
        parent_id=deck_req.parent_id,
        name=deck_req.name,
        description=deck_req.description,
    )
    deck.save(db_session)
    return deck


@router.get("", response_model=List[DeckOut])
def get_decks(
    parent_id: UUID = None,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    query = db_session.query(Deck).filter(Deck.user_id == user.id).order_by(Deck.name)

    if parent_id:
        query = query.filter(Deck.parent_id == parent_id)

    return query.all()


@router.get("/tree", response_model=DeckTree)
def get_decks_tree(
    user: User = Depends(get_current_user), db_session: Session = Depends(get_db)
):
    decks = Deck.filter_by(db_session, user_id=user.id).order_by(Deck.name).all()

    deck_map = {deck.id: deck for deck in decks}
    root_decks = []
    tree_depth = 0

    def build_node(deck: Deck) -> DeckNode:
        node_depth = get_depth_to_root(deck) + 1
        nonlocal tree_depth
        tree_depth = max(tree_depth, node_depth)

        children = [
            build_node(deck_map[child.id])
            for child in decks
            if child.parent_id == deck.id
        ]

        return DeckNode(
            id=deck.id,
            name=deck.name,
            children=sorted(children, key=lambda d: d.name),
            card_count=len(deck.cards) if hasattr(deck, "cards") else 0,
            depth=node_depth,
        )

    for deck in decks:
        if deck.parent_id is None:
            root_decks.append(build_node(deck))

    return DeckTree(
        decks=sorted(root_decks, key=lambda d: d.name),
        total_decks=len(decks),
        tree_depth=tree_depth,
    )


@router.get("/{deck_id}", response_model=DeckOut)
def get_deck(
    deck_id: UUID = None,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    try:
        deck = get_user_deck(deck_id, user.id, db_session)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))

    return deck


@router.patch("/{deck_id}", response_model=DeckOut)
def update_deck(
    deck_id: UUID,
    deck_req: DeckUpdate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    try:
        deck = get_user_deck(deck_id, user.id, db_session)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))

    if deck_req.parent_id == deck_id:
        raise HTTPException(
            status_code=400, detail="Can't set deck to be its own parent"
        )

    if deck_req.parent_id:
        try:
            parent_deck = get_user_deck(deck_req.parent_id, user.id, db_session)
        except ValueError as err:
            raise HTTPException(status_code=404, detail=str(err))

        if would_create_cycle(deck.id, parent_deck):
            raise HTTPException(
                status_code=400, detail="Would create circular reference"
            )

    updates = deck_req.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(deck, field, value)
    deck.save(db_session)
    return deck


@router.delete("/{deck_id}")
def delete_deck(
    deck_id: UUID,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    try:
        deck = get_user_deck(deck_id, user.id, db_session)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))

    try:
        # Move child decks to the parent of the deleted deck
        for child in deck.children:
            child.parent_id = deck.parent_id
            db_session.add(child)

        db_session.commit()

        deck.delete(db_session)
        return {"id": deck.id}
    except Exception:
        db_session.rollback()
        raise


@router.post("/import", status_code=201)
async def import_deck(
    format: str = "repeater",
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    if user.is_guest:
        raise HTTPException(status_code=403)

    if format == "repeater":
        importer: BaseImporter = CustomImporter()
        try:
            content = await file.read()
            deck_data = importer.parse(content)
        except Exception as err:
            raise HTTPException(status_code=400, detail=err)
        store_imported_deck(deck_data, user.id, db_session)
    else:
        raise HTTPException(status_code=400, detail="Unknown format")


@router.get(
    "/{deck_id}/export",
    response_class=StreamingResponse,
    responses={
        200: {
            "content": {
                "application/octet-stream": {
                    "schema": {"type": "string", "format": "binary"}
                }
            },
            "description": "A downloadable JSON file",
        }
    },
)
def export_deck(
    deck_id: UUID,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    if user.is_guest:
        raise HTTPException(status_code=403)

    try:
        deck = get_user_deck(deck_id, user.id, db_session)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))

    safe_filename = "".join(
        c for c in deck.name if c.isalnum() or c in (" ", "-", "_")
    ).rstrip()
    safe_filename = safe_filename or "deck"

    deck_data = deck_to_deck_data(deck)
    deck_bytes = export(deck_data)
    return StreamingResponse(
        BytesIO(deck_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.json"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
