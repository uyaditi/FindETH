"""Pydantic request / response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────────────────────────────────────────────────────
# Hunt metadata — publish / read (NEVER contains an `answer` field)
# ─────────────────────────────────────────────────────────────────────────────

class ClueIn(BaseModel):
    """A clue as submitted when publishing hunt metadata.

    `extra="forbid"` is deliberate: if a client sends an `answer` field (e.g. a
    stale frontend build reusing the AI draft shape), the request must fail
    loudly with 422 rather than silently persist or drop the plaintext answer.
    """

    model_config = ConfigDict(extra="forbid")

    order: int
    text: str
    hint: Optional[str] = None
    url: Optional[str] = None
    page: Optional[str] = None
    section: Optional[str] = None
    label: Optional[str] = None


class ClueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order: int = Field(validation_alias="order_index")
    text: str
    hint: Optional[str] = None
    url: Optional[str] = None
    page: Optional[str] = None
    section: Optional[str] = None
    label: Optional[str] = None


class PublishMetadataRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    creator: str
    signature: str
    title: str
    description: Optional[str] = None
    story: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    clues: List[ClueIn]
    isBusiness: Optional[bool] = False
    businessName: Optional[str] = None
    businessLogo: Optional[str] = None
    businessAccent: Optional[str] = None
    isAiGenerated: Optional[bool] = False
    aiConfidence: Optional[float] = None


class HuntMetadataOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    huntId: int = Field(validation_alias="hunt_id")
    creator: str
    title: str
    description: Optional[str] = None
    story: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    isBusiness: bool = Field(validation_alias="is_business")
    businessName: Optional[str] = Field(default=None, validation_alias="business_name")
    businessLogo: Optional[str] = Field(default=None, validation_alias="business_logo")
    businessAccent: Optional[str] = Field(default=None, validation_alias="business_accent")
    isAiGenerated: bool = Field(validation_alias="is_ai_generated")
    aiConfidence: Optional[float] = Field(default=None, validation_alias="ai_confidence")
    createdAt: datetime = Field(validation_alias="created_at")
    updatedAt: Optional[datetime] = Field(default=None, validation_alias="updated_at")
    clues: List[ClueOut]


# ─────────────────────────────────────────────────────────────────────────────
# AI generation — draft shapes DO include plaintext answers (never persisted)
# ─────────────────────────────────────────────────────────────────────────────

class ClueLocation(BaseModel):
    url: Optional[str] = None
    page: Optional[str] = None
    section: Optional[str] = None
    label: Optional[str] = None


class AIHuntGenerationInput(BaseModel):
    businessUrl: str
    businessName: str
    businessType: str
    campaign: str
    targetAudience: str
    channels: List[str] = Field(default_factory=list)
    difficulty: str
    huntType: int
    prize: str


class AIGeneratedClue(BaseModel):
    order: int
    text: str
    answer: str
    location: ClueLocation
    placementInstruction: str
    reason: str
    merchantAction: str
    locationFound: bool = False


class AIGeneratedHunt(BaseModel):
    title: str
    description: str
    story: str
    difficulty: str
    huntType: int
    clues: List[AIGeneratedClue]
    finalAnswer: str
    suggestedPrize: str
    confidence: float
    analysedPages: Optional[int] = None
    analysedBlogs: Optional[int] = None
    analysedProducts: Optional[int] = None


class RegenerateClueContext(BaseModel):
    businessName: str
    businessUrl: str


class RegenerateClueRequest(BaseModel):
    clue: AIGeneratedClue
    context: RegenerateClueContext
