"""initial schema: hunts, clues

Revision ID: 0001
Revises:
Create Date: 2026-09-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "hunts",
        sa.Column("hunt_id", sa.BigInteger(), primary_key=True, autoincrement=False),
        sa.Column("creator", sa.String(length=42), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("story", sa.Text(), nullable=True),
        sa.Column("difficulty", sa.String(length=16), nullable=True),
        sa.Column("category", sa.Text(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("is_business", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("business_name", sa.Text(), nullable=True),
        sa.Column("business_logo", sa.Text(), nullable=True),
        sa.Column("business_accent", sa.Text(), nullable=True),
        sa.Column("is_ai_generated", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("ai_confidence", sa.Numeric(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_hunts_creator", "hunts", ["creator"])

    op.create_table(
        "clues",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "hunt_id",
            sa.BigInteger(),
            sa.ForeignKey("hunts.hunt_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("hint", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("page", sa.Text(), nullable=True),
        sa.Column("section", sa.Text(), nullable=True),
        sa.Column("label", sa.Text(), nullable=True),
        sa.UniqueConstraint("hunt_id", "order_index", name="uq_clue_hunt_order"),
    )
    op.create_index("ix_clues_hunt_id", "clues", ["hunt_id"])


def downgrade() -> None:
    op.drop_index("ix_clues_hunt_id", table_name="clues")
    op.drop_table("clues")
    op.drop_index("ix_hunts_creator", table_name="hunts")
    op.drop_table("hunts")
