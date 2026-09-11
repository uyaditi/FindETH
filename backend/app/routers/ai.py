"""Real AI hunt generation, grounded in a business's actual website content.

Replaces the old hardcoded/template "AI" generator. If content can't be
fetched or Ollama is unavailable, these endpoints fail honestly (502/500)
rather than fabricating a hunt — that fallback, if wanted, is the frontend's
explicit opt-in job, not this backend's.
"""
import logging

from fastapi import APIRouter, HTTPException

from app.schemas import AIHuntGenerationInput, RegenerateClueRequest
from app.services import content_fetch, gemini, ollama

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _provider():
    from app.config import get_settings

    provider = get_settings().AI_PROVIDER.lower().strip()
    if provider == "ollama":
        return ollama
    if provider == "gemini":
        return gemini
    raise HTTPException(status_code=500, detail=f"Unsupported AI_PROVIDER: {provider}")


@router.post("/generate")
async def generate_hunt(body: AIHuntGenerationInput):
    try:
        page_text = await content_fetch.fetch_page_text(body.businessUrl)
    except content_fetch.FetchError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch content from {body.businessUrl}: {exc}",
        ) from exc

    try:
        provider = _provider()
        result = provider.generate_hunt(body, page_text)
    except (ollama.OllamaConfigError, gemini.GeminiConfigError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except (ollama.OllamaGenerationError, gemini.GeminiGenerationError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result


@router.post("/regenerate-clue")
async def regenerate_clue(body: RegenerateClueRequest):
    try:
        page_text = await content_fetch.fetch_page_text(body.context.businessUrl)
    except content_fetch.FetchError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch content from {body.context.businessUrl}: {exc}",
        ) from exc

    try:
        provider = _provider()
        result = provider.regenerate_clue(
            body.clue, body.context.businessName, body.context.businessUrl, page_text
        )
    except (ollama.OllamaConfigError, gemini.GeminiConfigError) as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except (ollama.OllamaGenerationError, gemini.GeminiGenerationError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return result
