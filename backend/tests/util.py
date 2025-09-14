from httpx import AsyncClient


async def create_deck(
    client: AsyncClient,
    name: str = "deck",
    description: str = "",
    parent_id: str | None = None,
):
    return await client.post(
        "/decks",
        json={"name": name, "description": description, "parent_id": parent_id},
    )


async def create_card(client: AsyncClient, deck_id: str, content: str = "Test card"):
    return await client.post(
        "/cards",
        json={
            "deck_id": deck_id,
            "content": content,
        },
    )
