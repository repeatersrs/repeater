import json
import uuid

from src.db.models import Card, Deck
from tests.asserts import is_utc_isoformat_string, is_uuid_string
from tests.util import create_deck


async def test_create_deck(db_session, user, user_client):
    res = await create_deck(user_client)
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": str(user.id),
        "parent_id": None,
        "name": "deck",
        "description": "",
        "is_paused": False,
        "is_archived": False,
        "is_root": True,
        "path": ["deck"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }

    deck = Deck.filter_by(db_session, user_id=user.id).first()
    assert deck is not None


async def test_get_deck(user, user_client):
    res = await user_client.get(f"/decks/{uuid.uuid4()}")
    assert res.status_code == 404

    res = await create_deck(user_client)
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.get(f"/decks/{deck_id}")
    assert res.status_code == 200
    assert res.json() == {
        "id": deck_id,
        "user_id": str(user.id),
        "parent_id": None,
        "name": "deck",
        "description": "",
        "is_paused": False,
        "is_archived": False,
        "is_root": True,
        "path": ["deck"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }


async def test_get_decks(user, user_client):
    res = await user_client.get("/decks")
    assert res.status_code == 200
    assert res.json() == []

    await create_deck(user_client)
    res = await user_client.get("/decks")
    assert res.status_code == 200
    assert res.json() == [
        {
            "id": is_uuid_string(),
            "user_id": str(user.id),
            "parent_id": None,
            "name": "deck",
            "description": "",
            "is_paused": False,
            "is_archived": False,
            "is_root": True,
            "path": ["deck"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        }
    ]


async def test_update_deck(user, user_client):
    res = await create_deck(user_client)
    assert res.status_code == 201

    deck_id = res.json()["id"]
    res = await user_client.patch(
        f"/decks/{deck_id}", json={"name": "test", "description": "test"}
    )
    assert res.status_code == 200
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": str(user.id),
        "parent_id": None,
        "name": "test",
        "description": "test",
        "is_paused": False,
        "is_archived": False,
        "is_root": True,
        "path": ["test"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }


async def test_update_deck_doesnt_exist_returns_404(user_client):
    res = await user_client.patch(
        f"/decks/{uuid.uuid4()}", json={"name": "test", "description": "test"}
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Resource not found or access denied"


async def test_update_deck_wrong_user_returns_404(admin_client, user_client):
    res = await create_deck(admin_client)
    assert res.status_code == 201

    deck_id = res.json()["id"]
    res = await user_client.patch(
        f"/decks/{deck_id}", json={"name": "test", "description": "test"}
    )
    assert res.status_code == 404
    assert res.json()["detail"] == "Resource not found or access denied"


async def test_delete_deck(db_session, user_client):
    res = await create_deck(user_client)
    assert res.status_code == 201

    deck_id = res.json()["id"]
    res = await user_client.delete(f"/decks/{deck_id}")
    assert res.status_code == 200
    assert res.json() == {"id": is_uuid_string()}

    deck = Deck.all(db_session)
    assert deck == []


async def test_delete_deck_doesnt_exist_returns_404(db_session, user_client):
    res = await create_deck(user_client)
    assert res.status_code == 201

    res = await user_client.delete(f"/decks/{uuid.uuid4()}")
    assert res.status_code == 404
    assert res.json()["detail"] == "Resource not found or access denied"

    deck = Deck.filter_by(db_session, name="deck").first()
    assert deck is not None


async def test_import_deck_custom_importer(db_session, user_client):
    with open("data/french.json", "rb") as file:
        file_bytes = file.read()
        file.seek(0)
        deck_json = json.load(file)

    files = {"file": ("french.json", file_bytes, "application/json")}
    res = await user_client.post(
        "decks/import", params={"format": "repeater"}, files=files
    )
    assert res.status_code == 201

    deck = Deck.all(db_session)[0]
    assert deck_json["name"] == deck.name
    assert len(deck_json["cards"]) == len(Card.all(db_session))


async def test_import_deck_mochi_markdown_importer_md(db_session, user_client):
    with open("tests/data/mochi_markdown_test.md", "rb") as file:
        file_bytes = file.read()

    files = {"file": ("mochi_markdown_test.md", file_bytes, "text/markdown")}
    res = await user_client.post(
        "decks/import", params={"format": "mochi_markdown"}, files=files
    )
    assert res.status_code == 201

    decks = Deck.all(db_session)
    assert len(decks) == 1
    assert decks[0].name == "mochi_markdown_test"

    cards = Card.filter_by(db_session, deck_id=decks[0].id).all()
    assert len(cards) == 1
    assert cards[0].content == "this card is a **test**\n---\ncette carte est un **test**\n"


async def test_import_deck_mochi_markdown_importer_zip(db_session, user_client):
    with open("tests/data/mochi_markdown_test.zip", "rb") as file:
        file_bytes = file.read()

    files = {"file": ("mochi_markdown_test.zip", file_bytes, "application/zip")}
    res = await user_client.post(
        "decks/import", params={"format": "mochi_markdown"}, files=files
    )
    assert res.status_code == 201

    decks = Deck.filter_by(db_session, parent_id=None).all()
    assert len(decks) == 1
    assert decks[0].name == "mochi_markdown_test"

    cards = Card.filter_by(db_session, deck_id=decks[0].id).all()
    assert len(cards) == 5

    sub_decks = Deck.filter_by(db_session, parent_id=decks[0].id).all()
    assert len(sub_decks) == 1
    assert "child deck" in sub_decks[0].name or "5Dvv6yxB" in sub_decks[0].name

    sub_cards = Card.filter_by(db_session, deck_id=sub_decks[0].id).all()
    assert len(sub_cards) == 2


async def test_export_deck(db_session, user_client):
    res = await create_deck(user_client)
    deck_id = res.json()["id"]
    res = await user_client.post(
        "/cards",
        json={
            "deck_id": deck_id,
            "content": "Test card",
        },
    )

    res = await user_client.get(f"/decks/{deck_id}/export")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/json"

    json_str = res.content.decode("utf-8")
    json_obj = json.loads(json_str)
    assert json_obj == {
        "version": "repeater-v1",
        "name": "deck",
        "description": "",
        "cards": [{"content": "Test card"}],
        "sub_decks": []
    }

async def test_export_deck_with_sub_decks(db_session, user_client):
    # TODO: implement
    pass

async def test_guest_user_import_deck_returns_403(client):
    with open("data/french.json", "rb") as file:
        file_bytes = file.read()

    files = {"file": ("french.json", file_bytes, "application/json")}
    res = await client.post("decks/import", params={"format": "repeater"}, files=files)
    assert res.status_code == 403


async def test_guest_user_export_deck_returns_403(client):
    res = await create_deck(client)
    deck_id = res.json()["id"]
    res = await client.post(
        "/cards",
        json={
            "deck_id": deck_id,
            "content": "Test card",
        },
    )

    res = await client.get(f"/decks/{deck_id}/export")
    assert res.status_code == 403


# --- Test hierarchical decks ---


async def test_create_subdeck(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=deck_id)
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": is_uuid_string(),
        "name": "child",
        "description": "",
        "parent_id": deck_id,
        "is_paused": False,
        "is_archived": False,
        "is_root": False,
        "path": ["parent", "child"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }


async def test_get_decks_with_children(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.get("/decks")
    assert res.json() == [
        {
            "id": child_id,
            "user_id": is_uuid_string(),
            "name": "child",
            "description": "",
            "parent_id": parent_id,
            "is_paused": False,
            "is_archived": False,
            "is_root": False,
            "path": ["parent", "child"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
        {
            "id": parent_id,
            "user_id": is_uuid_string(),
            "name": "parent",
            "description": "",
            "parent_id": None,
            "is_paused": False,
            "is_archived": False,
            "is_root": True,
            "path": ["parent"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]


async def test_get_decks_filtered_by_parent(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await create_deck(user_client, name="orphan")
    assert res.status_code == 201

    # Get only children of parent
    res = await user_client.get(f"/decks?parent_id={parent_id}")
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == child_id
    assert res.json()[0]["name"] == "child"


async def test_get_deck_tree(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="middle", parent_id=parent_id)
    assert res.status_code == 201
    middle_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=middle_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.get("/decks/tree")

    assert res.json() == {
        "decks": [
            {
                "id": parent_id,
                "name": "parent",
                "children": [
                    {
                        "id": middle_id,
                        "name": "middle",
                        "children": [
                            {
                                "id": child_id,
                                "name": "child",
                                "children": [],
                                "card_count": 0,
                                "depth": 3,
                                "is_paused": False,
                            }
                        ],
                        "card_count": 0,
                        "depth": 2,
                        "is_paused": False,
                    }
                ],
                "card_count": 0,
                "depth": 1,
                "is_paused": False,
            }
        ],
        "total_decks": 3,
        "tree_depth": 3,
    }


async def test_move_deck_to_new_parent(user_client):
    res = await create_deck(user_client, name="parent 1")
    assert res.status_code == 201
    parent1_id = res.json()["id"]

    res = await create_deck(user_client, name="parent 2")
    assert res.status_code == 201
    parent2_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent1_id)
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": is_uuid_string(),
        "name": "child",
        "description": "",
        "parent_id": parent1_id,
        "is_paused": False,
        "is_archived": False,
        "is_root": False,
        "path": ["parent 1", "child"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }
    child_id = res.json()["id"]

    res = await user_client.patch(f"/decks/{child_id}", json={"parent_id": parent2_id})
    assert res.status_code == 200
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": is_uuid_string(),
        "name": "child",
        "description": "",
        "parent_id": parent2_id,
        "is_paused": False,
        "is_archived": False,
        "is_root": False,
        "path": ["parent 2", "child"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }


async def test_move_deck_under_own_descendant(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.patch(f"/decks/{parent_id}", json={"parent_id": child_id})
    assert res.status_code == 400
    assert res.json()["detail"] == "Would create circular reference"


async def test_move_deck_to_nonexistent_parent(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await user_client.patch(
        f"/decks/{parent_id}", json={"parent_id": str(uuid.uuid4())}
    )
    assert res.status_code == 404


async def test_move_deck_to_other_users_deck(user_client, admin_client):
    res = await create_deck(admin_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child")
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.patch(f"/decks/{child_id}", json={"parent_id": parent_id})
    assert res.status_code == 404


async def test_delete_deck_with_subdecks(user_client, db_session):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.delete(f"/decks/{parent_id}")
    assert res.status_code == 200
    assert res.json() == {"id": parent_id}

    child_deck = Deck.get(db_session, child_id)
    assert child_deck
    assert child_deck.parent_id is None


async def test_delete_deck_with_nested_structure(user_client, db_session):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="middle", parent_id=parent_id)
    assert res.status_code == 201
    middle_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=middle_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.delete(f"/decks/{middle_id}")
    assert res.status_code == 200
    assert res.json() == {"id": middle_id}

    child_deck = Deck.get(db_session, child_id)
    assert child_deck
    assert str(child_deck.parent_id) == parent_id


async def test_user_can_only_see_own_decks(user_client, admin_client):
    res = await create_deck(admin_client, name="admin")
    assert res.status_code == 201

    res = await create_deck(user_client, name="user")
    assert res.status_code == 201

    res = await user_client.get("/decks")
    assert res.json() == [
        {
            "id": is_uuid_string(),
            "user_id": is_uuid_string(),
            "name": "user",
            "description": "",
            "parent_id": None,
            "is_paused": False,
            "is_archived": False,
            "is_root": True,
            "path": ["user"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        },
    ]


async def test_user_cannot_modify_other_users_decks(user_client, admin_client):
    res = await create_deck(admin_client, name="admin")
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await create_deck(user_client, name="user")
    assert res.status_code == 201

    res = await user_client.patch(f"/decks/{deck_id}", json={"name": "test"})
    assert res.status_code == 404


async def test_self_referential_parent(user_client):
    res = await create_deck(user_client, name="deck")
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.patch(f"/decks/{deck_id}", json={"parent_id": deck_id})
    assert res.status_code == 400
    assert res.json()["detail"] == "Can't set deck to be its own parent"


async def test_get_deck_tree_complex(user_client):
    # Create root deck
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    # Create child deck under parent
    res = await create_deck(user_client, name="middle", parent_id=parent_id)
    assert res.status_code == 201
    middle_id = res.json()["id"]

    # Create grandchild deck under middle
    res = await create_deck(user_client, name="child", parent_id=middle_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    # Create another child under middle
    res = await create_deck(user_client, name="child2", parent_id=middle_id)
    assert res.status_code == 201
    child2_id = res.json()["id"]

    # Create standalone root deck
    res = await create_deck(user_client, name="standalone")
    assert res.status_code == 201
    standalone_id = res.json()["id"]

    res = await user_client.get("/decks/tree")

    assert res.json() == {
        "decks": [
            {
                "id": parent_id,
                "name": "parent",
                "children": [
                    {
                        "id": middle_id,
                        "name": "middle",
                        "children": [
                            {
                                "id": child_id,
                                "name": "child",
                                "children": [],
                                "card_count": 0,
                                "depth": 3,
                                "is_paused": False,
                            },
                            {
                                "id": child2_id,
                                "name": "child2",
                                "children": [],
                                "card_count": 0,
                                "depth": 3,
                                "is_paused": False,
                            },
                        ],
                        "card_count": 0,
                        "depth": 2,
                        "is_paused": False,
                    }
                ],
                "card_count": 0,
                "depth": 1,
                "is_paused": False,
            },
            {
                "id": standalone_id,
                "name": "standalone",
                "children": [],
                "card_count": 0,
                "depth": 1,
                "is_paused": False,
            },
        ],
        "total_decks": 5,
        "tree_depth": 3,
    }


async def test_delete_deck_with_subdecks_move_to_parent(user_client, db_session):
    res = await create_deck(user_client, name="grandparent")
    assert res.status_code == 201
    grandparent_id = res.json()["id"]

    res = await create_deck(user_client, name="parent", parent_id=grandparent_id)
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.delete(f"/decks/{parent_id}")
    assert res.status_code == 200

    child_deck = Deck.get(db_session, child_id)
    assert child_deck
    assert str(child_deck.parent_id) == grandparent_id


async def test_delete_root_deck_makes_children_orphaned(user_client, db_session):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    res = await user_client.delete(f"/decks/{parent_id}")
    assert res.status_code == 200

    child_deck = Deck.get(db_session, child_id)
    assert child_deck
    assert child_deck.parent_id is None


async def test_get_deck_tree_shallow(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await user_client.get("/decks/tree")
    assert res.json() == {
        "decks": [
            {
                "id": parent_id,
                "name": "parent",
                "children": [],
                "card_count": 0,
                "depth": 1,
                "is_paused": False,
            }
        ],
        "total_decks": 1,
        "tree_depth": 1,
    }


async def test_create_deck_with_nonexistent_parent(user_client):
    res = await create_deck(user_client, name="child", parent_id=str(uuid.uuid4()))
    assert res.status_code == 404


async def test_create_deck_with_other_users_parent(user_client, admin_client):
    res = await create_deck(admin_client, name="admin_deck")
    assert res.status_code == 201
    admin_deck_id = res.json()["id"]

    res = await create_deck(user_client, name="user_deck", parent_id=admin_deck_id)
    assert res.status_code == 404


async def test_deck_path_property(user_client):
    res = await create_deck(user_client, name="level1")
    assert res.status_code == 201
    level1_id = res.json()["id"]

    res = await create_deck(user_client, name="level2", parent_id=level1_id)
    assert res.status_code == 201
    level2_id = res.json()["id"]

    res = await create_deck(user_client, name="level3", parent_id=level2_id)
    assert res.status_code == 201

    res = await user_client.get(f"/decks/{res.json()['id']}")
    assert res.json()["path"] == ["level1", "level2", "level3"]
    assert res.json()["is_root"] == False


async def test_move_deck_to_remove_parent(user_client):
    res = await create_deck(user_client, name="parent")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(user_client, name="child", parent_id=parent_id)
    assert res.status_code == 201
    child_id = res.json()["id"]

    # Move child to be a root deck
    res = await user_client.patch(f"/decks/{child_id}", json={"parent_id": None})
    assert res.status_code == 200
    assert res.json()["parent_id"] is None
    assert res.json()["is_root"] == True
    assert res.json()["path"] == ["child"]


async def test_move_deck_to_existing_parent(user_client):
    res = await create_deck(user_client, name="parent1")
    assert res.status_code == 201
    p1_id = res.json()["id"]

    res = await create_deck(user_client, name="parent2")
    assert res.status_code == 201
    p2_id = res.json()["id"]

    res = await create_deck(
        user_client,
        name="deck",
        description="my deck",
        parent_id=p1_id,
    )
    assert res.status_code == 201
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": is_uuid_string(),
        "parent_id": p1_id,
        "name": "deck",
        "description": "my deck",
        "is_paused": False,
        "is_archived": False,
        "is_root": False,
        "path": ["parent1", "deck"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }
    deck_id = res.json()["id"]

    res = await user_client.patch(
        f"/decks/{deck_id}",
        json={
            "parent_id": p2_id,
        },
    )
    assert res.status_code == 200
    assert res.json() == {
        "id": is_uuid_string(),
        "user_id": is_uuid_string(),
        "parent_id": p2_id,
        "name": "deck",
        "description": "my deck",
        "is_paused": False,
        "is_archived": False,
        "is_root": False,
        "path": ["parent2", "deck"],
        "created_at": is_utc_isoformat_string(),
        "updated_at": is_utc_isoformat_string(),
    }


async def test_move_deck_to_nonexistent_parent_via_patch(user_client):
    res = await create_deck(user_client, name="deck", description="my deck")
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.patch(
        f"/decks/{deck_id}",
        json={
            "parent_id": str(uuid.uuid4()),
        },
    )
    assert res.status_code == 404


async def test_move_deck_to_other_users_parent(user_client, admin_client):
    res = await create_deck(admin_client, name="admin_deck")
    assert res.status_code == 201
    admin_deck_id = res.json()["id"]

    res = await create_deck(user_client, name="user_deck", description="my deck")
    assert res.status_code == 201
    deck_id = res.json()["id"]

    res = await user_client.patch(
        f"/decks/{deck_id}",
        json={
            "parent_id": admin_deck_id,
        },
    )
    assert res.status_code == 404


async def test_get_decks_by_parent(user, user_client):
    res = await create_deck(user_client, name="parent_deck")
    assert res.status_code == 201
    parent_id = res.json()["id"]

    res = await create_deck(
        user_client,
        name="deck inside parent",
        description="my deck",
        parent_id=parent_id,
    )
    assert res.status_code == 201

    res = await create_deck(
        user_client,
        name="deck outside parent",
        description="my deck",
    )
    assert res.status_code == 201

    res = await user_client.get("/decks", params={"parent_id": parent_id})
    assert res.json() == [
        {
            "id": is_uuid_string(),
            "user_id": str(user.id),
            "parent_id": parent_id,
            "name": "deck inside parent",
            "description": "my deck",
            "is_paused": False,
            "is_archived": False,
            "is_root": False,
            "path": ["parent_deck", "deck inside parent"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        }
    ]


async def test_get_decks_exclude_paused(user, user_client):
    deck_to_pause = await create_deck(user_client)
    active_deck = await create_deck(user_client)

    deck_to_pause_id = deck_to_pause.json()["id"]
    active_deck_id = active_deck.json()["id"]

    res = await user_client.patch(
        f"/decks/{deck_to_pause_id}", json={"is_paused": True}
    )

    res = await user_client.get("/decks?exclude_paused=true")
    assert res.status_code == 200
    assert res.json() == [
        {
            "id": active_deck_id,
            "user_id": str(user.id),
            "parent_id": None,
            "name": "deck",
            "description": "",
            "is_paused": False,
            "is_archived": False,
            "is_root": True,
            "path": ["deck"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        }
    ]


async def test_get_decks_exclude_archived(user, user_client):
    deck_to_archive = await create_deck(user_client)
    active_deck = await create_deck(user_client)

    deck_to_archive_id = deck_to_archive.json()["id"]
    active_deck_id = active_deck.json()["id"]

    res = await user_client.patch(
        f"/decks/{deck_to_archive_id}", json={"is_archived": True}
    )

    res = await user_client.get("/decks?exclude_archived=true")
    assert res.status_code == 200
    assert res.json() == [
        {
            "id": active_deck_id,
            "user_id": str(user.id),
            "parent_id": None,
            "name": "deck",
            "description": "",
            "is_paused": False,
            "is_archived": False,
            "is_root": True,
            "path": ["deck"],
            "created_at": is_utc_isoformat_string(),
            "updated_at": is_utc_isoformat_string(),
        }
    ]


async def test_get_decks_exclude_paused_parent(user, user_client):
    deck_to_pause = await create_deck(user_client)
    deck_to_pause_id = deck_to_pause.json()["id"]
    await create_deck(user_client, parent_id=deck_to_pause_id)

    res = await user_client.patch(
        f"/decks/{deck_to_pause_id}", json={"is_paused": True}
    )

    res = await user_client.get("/decks?exclude_paused=true")
    assert res.status_code == 200
    assert res.json() == []


async def test_get_decks_exclude_archived_parent(user, user_client):
    deck_to_archive = await create_deck(user_client)
    deck_to_archive_id = deck_to_archive.json()["id"]
    await create_deck(user_client, parent_id=deck_to_archive_id)

    res = await user_client.patch(
        f"/decks/{deck_to_archive_id}", json={"is_archived": True}
    )

    res = await user_client.get("/decks?exclude_archived=true")
    assert res.status_code == 200
    assert res.json() == []


async def test_get_deck_tree_does_not_show_archived_decks(user_client):
    deck_to_archive = await create_deck(user_client)
    deck_to_archive_id = deck_to_archive.json()["id"]
    await create_deck(user_client, parent_id=deck_to_archive_id)

    res = await user_client.patch(
        f"/decks/{deck_to_archive_id}", json={"is_archived": True}
    )

    res = await user_client.get("/decks/tree")
    assert res.json() == {
        "decks": [],
        "total_decks": 0,
        "tree_depth": 0,
    }
