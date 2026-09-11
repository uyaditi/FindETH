"""SQLAlchemy ORM models.

IMPORTANT: There is no `answer` column anywhere in this schema, ever. The clue
answer hash already lives immutably on-chain per clue index; this database
only ever stores flavour text (what the clue says, where to look), never the
solution. Plaintext answers only ever appear transiently in the JSON response
of POST /api/ai/generate, which goes straight back to the creator's own
browser for review and is never persisted here.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Hunt(Base):
    __tablename__ = "hunts"

    hunt_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    creator: Mapped[str] = mapped_column(String(42), nullable=False, index=True)

    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(16), nullable=True)
    category: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    is_business: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    business_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_logo: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_accent: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    ai_confidence: Mapped[float | None] = mapped_column(Numeric, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    clues: Mapped[list["Clue"]] = relationship(
        "Clue", back_populates="hunt", cascade="all, delete-orphan", order_by="Clue.order_index"
    )


class Clue(Base):
    __tablename__ = "clues"
    __table_args__ = (UniqueConstraint("hunt_id", "order_index", name="uq_clue_hunt_order"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hunt_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("hunts.hunt_id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    page: Mapped[str | None] = mapped_column(Text, nullable=True)
    section: Mapped[str | None] = mapped_column(Text, nullable=True)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)

    hunt: Mapped["Hunt"] = relationship("Hunt", back_populates="clues")
