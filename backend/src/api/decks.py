from io import BytesIO
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

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
from src.import_export.mochi_markdown import MochiMarkdownImporter
from src.schemas.deck import (
    DeckCreate,
    DeckNode,
    DeckOut,
    DeckTree,
    DeckUpdate,
    ImportFormat,
)
from src.util import (
    get_depth_to_root,
    set_children_archived,
    set_children_paused,
    would_create_cycle,
)

router = APIRouter(prefix="/decks", tags=["decks"])


@router.post("", response_model=DeckOut, status_code=201)
def create_deck(
    deck_req: DeckCreate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    if deck_req.parent_id:
        Deck.filter_by(db_session, id=deck_req.parent_id, user_id=user.id).one()

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
    exclude_paused: bool = False,
    exclude_archived: bool = False,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    query = db_session.query(Deck).filter(Deck.user_id == user.id).order_by(Deck.name)

    if parent_id:
        query = query.filter(Deck.parent_id == parent_id)

    if exclude_paused:
        query = query.filter(Deck.is_paused == False)

    if exclude_archived:
        query = query.filter(Deck.is_archived == False)

    return query.all()


@router.get("/tree", response_model=DeckTree)
def get_decks_tree(
    user: User = Depends(get_current_user), db_session: Session = Depends(get_db)
):
    decks = Deck.filter_by(db_session, user_id=user.id).order_by(Deck.name).all()

    deck_map = {deck.id: deck for deck in decks}
    root_decks = []
    tree_depth = 0
    tree_decks = 0

    def build_node(deck: Deck) -> DeckNode:
        node_depth = get_depth_to_root(deck) + 1
        nonlocal tree_depth
        nonlocal tree_decks
        tree_depth = max(tree_depth, node_depth)
        tree_decks += 1

        children = [
            build_node(deck_map[child.id])
            for child in decks
            if child.parent_id == deck.id and not child.is_archived
        ]

        return DeckNode(
            id=deck.id,
            name=deck.name,
            children=sorted(children, key=lambda d: d.name),
            card_count=len(deck.cards) if hasattr(deck, "cards") else 0,
            depth=node_depth,
            is_paused=deck.is_paused,
        )

    for deck in decks:
        if deck.parent_id is None and not deck.is_archived:
            root_decks.append(build_node(deck))

    return DeckTree(
        decks=sorted(root_decks, key=lambda d: d.name),
        total_decks=tree_decks,
        tree_depth=tree_depth,
    )


@router.get("/{deck_id}", response_model=DeckOut)
def get_deck(
    deck_id: UUID = None,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    deck = Deck.filter_by(db_session, id=deck_id, user_id=user.id).one()
    return deck


@router.patch("/{deck_id}", response_model=DeckOut)
def update_deck(
    deck_id: UUID,
    deck_req: DeckUpdate,
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    deck = Deck.filter_by(db_session, id=deck_id, user_id=user.id).one()

    if deck_req.parent_id == deck_id:
        raise HTTPException(
            status_code=400, detail="Can't set deck to be its own parent"
        )

    if deck_req.parent_id:
        parent_deck = Deck.filter_by(
            db_session, id=deck_req.parent_id, user_id=user.id
        ).one()

        if would_create_cycle(deck.id, parent_deck):
            raise HTTPException(
                status_code=400, detail="Would create circular reference"
            )

    if deck_req.is_paused:
        set_children_paused(deck, db_session)

    if deck_req.is_archived:
        set_children_archived(deck, db_session)

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
    deck = Deck.filter_by(db_session, id=deck_id, user_id=user.id).one()

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
    format: ImportFormat = ImportFormat.REPEATER,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    if user.is_guest:
        raise HTTPException(status_code=403)

    if format == ImportFormat.REPEATER:
        importer: BaseImporter = CustomImporter()
    elif format == ImportFormat.MOCHI_MARKDOWN:
        importer: BaseImporter = MochiMarkdownImporter()
    else:
        raise ValueError(f"Unsupported import format: {format}")

    try:
        deck_data = await importer.parse_file(file)
    except Exception as err:
        raise HTTPException(status_code=400, detail=err)
    store_imported_deck(deck_data, user.id, db_session)


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
    include_sub_decks: bool = True,
):
    if user.is_guest:
        raise HTTPException(status_code=403)

    if include_sub_decks:
        deck = (
            db_session.query(Deck)
            .filter_by(id=deck_id, user_id=user.id)
            .options(
                selectinload(Deck.cards),
                selectinload(Deck.children).selectinload(Deck.cards),
                selectinload(Deck.children)
                .selectinload(Deck.children)
                .selectinload(Deck.cards),
                selectinload(Deck.children)
                .selectinload(Deck.children)
                .selectinload(Deck.children)
                .selectinload(Deck.cards),
            )
            .one()
        )
    else:
        deck = db_session.query(Deck).filter_by(id=deck_id, user_id=user.id).one()

    safe_filename = "".join(
        c for c in deck.name if c.isalnum() or c in (" ", "-", "_")
    ).rstrip()
    safe_filename = safe_filename or "deck"

    deck_data = deck_to_deck_data(deck, include_sub_decks=include_sub_decks)
    deck_bytes = export(deck_data)
    return StreamingResponse(
        BytesIO(deck_bytes),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.json"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
