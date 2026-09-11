"""Hunt metadata endpoints — the off-chain flavour text (story, hints, where to
look) for an on-chain hunt. Never stores or returns plaintext answers; those
live only on-chain as keccak256 hashes.
"""
import logging
from typing import List, Optional

from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Clue, Hunt
from app.schemas import HuntMetadataOut, PublishMetadataRequest
from app.services import chain

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/hunts", tags=["metadata"])


def _publish_message(hunt_id: int) -> str:
    return f"Publish metadata for hunt {hunt_id}"


def _recover_signer(hunt_id: int, signature: str) -> str:
    message = encode_defunct(text=_publish_message(hunt_id))
    try:
        return Account.recover_message(message, signature=signature)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid signature: {exc}") from exc


@router.post("/{hunt_id}/metadata", response_model=HuntMetadataOut, status_code=201)
def publish_metadata(hunt_id: int, body: PublishMetadataRequest, db: Session = Depends(get_db)):
    existing = db.get(Hunt, hunt_id)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Metadata for this hunt has already been published")

    recovered = _recover_signer(hunt_id, body.signature)

    if recovered.lower() != body.creator.lower():
        raise HTTPException(
            status_code=403,
            detail="Signature does not match the claimed creator address",
        )

    try:
        onchain_creator = chain.get_hunt_creator(hunt_id)
    except chain.ChainConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Could not verify on-chain hunt creator: {exc}"
        ) from exc

    if onchain_creator == "0x0000000000000000000000000000000000000000":
        raise HTTPException(status_code=404, detail=f"Hunt {hunt_id} does not exist on-chain")

    if recovered.lower() != onchain_creator.lower():
        raise HTTPException(
            status_code=403,
            detail="Signer is not the on-chain creator of this hunt",
        )

    hunt = Hunt(
        hunt_id=hunt_id,
        creator=body.creator,
        title=body.title,
        description=body.description,
        story=body.story,
        difficulty=body.difficulty,
        category=body.category,
        tags=body.tags,
        is_business=bool(body.isBusiness),
        business_name=body.businessName,
        business_logo=body.businessLogo,
        business_accent=body.businessAccent,
        is_ai_generated=bool(body.isAiGenerated),
        ai_confidence=body.aiConfidence,
    )
    for clue_in in body.clues:
        hunt.clues.append(
            Clue(
                order_index=clue_in.order,
                text=clue_in.text,
                hint=clue_in.hint,
                url=clue_in.url,
                page=clue_in.page,
                section=clue_in.section,
                label=clue_in.label,
            )
        )

    db.add(hunt)
    db.commit()
    db.refresh(hunt)
    return hunt


@router.get("/{hunt_id}/metadata", response_model=HuntMetadataOut)
def get_metadata(hunt_id: int, db: Session = Depends(get_db)):
    hunt = db.get(Hunt, hunt_id)
    if hunt is None:
        raise HTTPException(status_code=404, detail="Hunt metadata not found")
    return hunt


@router.get("", response_model=List[HuntMetadataOut])
def list_metadata(creator: Optional[str] = None, db: Session = Depends(get_db)):
    stmt = select(Hunt)
    if creator:
        stmt = stmt.where(Hunt.creator.ilike(creator))
    hunts = db.scalars(stmt.order_by(Hunt.hunt_id)).all()
    return hunts
