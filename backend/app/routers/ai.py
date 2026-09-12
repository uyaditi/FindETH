"""Real AI hunt generation, grounded in a business's actual website content.

Replaces the old hardcoded/template "AI" generator. If content can't be
fetched or Gemini isn't configured, these endpoints fail honestly (502/500)
rather than fabricating a hunt — that fallback, if wanted, is the frontend's
explicit opt-in job, not this backend's.
"""
import logging

from fastapi import APIRouter, HTTPException

from app.schemas import AIHuntGenerationInput, RegenerateClueRequest
from app.services import content_fetch, gemini

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/generate")
async def generate_hunt(body: AIHuntGenerationInput):
    if body.businessUrl:
        try:
            source_text = await content_fetch.fetch_page_text(body.businessUrl)
        except content_fetch.FetchError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not fetch content from {body.businessUrl}: {exc}",
            ) from exc
        is_scraped = True
    else:
        source_text = body.businessDescription or ""
        is_scraped = False

    try:
        result = gemini.generate_hunt(body, source_text, is_scraped=is_scraped)
    except gemini.GeminiConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except gemini.GeminiGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result


@router.post("/regenerate-clue")
async def regenerate_clue(body: RegenerateClueRequest):
    ctx = body.context
    if ctx.businessUrl:
        try:
            source_text = await content_fetch.fetch_page_text(ctx.businessUrl)
        except content_fetch.FetchError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Could not fetch content from {ctx.businessUrl}: {exc}",
            ) from exc
        is_scraped = True
    else:
        source_text = ctx.businessDescription or ""
        is_scraped = False

    try:
        result = gemini.regenerate_clue(
            body.clue, ctx.businessName, source_text, is_scraped=is_scraped, business_url=ctx.businessUrl
        )
    except gemini.GeminiConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except gemini.GeminiGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result
