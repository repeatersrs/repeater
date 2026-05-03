"""add review undo fields

Revision ID: 6ba02ca7f07d
Revises: 2164e7d37b72
Create Date: 2026-05-03 12:24:20.273707

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6ba02ca7f07d"
down_revision: Union[str, None] = "2164e7d37b72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column("cards", "next_review_date", new_column_name="due_date")
    op.add_column(
        "reviews",
        sa.Column("previous_due_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "reviews",
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "reviews", sa.Column("undone_at", sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("reviews", "undone_at")
    op.drop_column("reviews", "due_date")
    op.drop_column("reviews", "previous_due_date")
    op.alter_column("cards", "due_date", new_column_name="next_review_date")
