"""Ollama client wrapper producing structured Qwen hunt drafts."""
from typing import List, Optional, Type

import httpx
from pydantic import BaseModel, Field

from app.config import get_settings
from app.schemas import AIGeneratedClue, AIHuntGenerationInput


class OllamaConfigError(RuntimeError):
    """Raised when the Ollama endpoint or model is not configured."""


class OllamaGenerationError(RuntimeError):
    """Raised when Ollama fails to return a parseable structured response."""


class _OllamaHuntDraft(BaseModel):
    title: str
    description: str
    story: str
    clues: List[AIGeneratedClue]
    finalAnswer: str
    suggestedPrize: str
    confidence: float = Field(ge=0, le=1)
    analysedPages: Optional[int] = None
    analysedBlogs: Optional[int] = None
    analysedProducts: Optional[int] = None


def _get_settings():
    settings = get_settings()
    if not settings.OLLAMA_BASE_URL or not settings.OLLAMA_MODEL:
        raise OllamaConfigError(
            "OLLAMA_BASE_URL and OLLAMA_MODEL must be configured for /api/ai/* endpoints."
        )
    return settings


def _hunt_generation_prompt(hunt_input: AIHuntGenerationInput, page_text: str) -> str:
    graph_context = ""
    if hunt_input.graphContext:
        graph_context = "\n" + str(hunt_input.graphContext.get("promptBlock") or hunt_input.graphContext) + "\n"

    return f"""You are designing a real-world/online "treasure hunt" marketing campaign for a
business, to be played by users who click through real pages of the business's own website.

Business name: {hunt_input.businessName}
Business type: {hunt_input.businessType}
Business URL: {hunt_input.businessUrl}
Campaign goal: {hunt_input.campaign}
Target audience: {hunt_input.targetAudience}
Marketing channels: {", ".join(hunt_input.channels) or "not specified"}
Desired difficulty: {hunt_input.difficulty}
Suggested prize (ETH): {hunt_input.prize}
{graph_context}

Below is the REAL visible text content fetched from the business's own website
(businessUrl). It has been stripped of scripts/styles/navigation and truncated.
Ground every clue in this content. Do not invent products, pages, or facts.

--- BEGIN FETCHED PAGE CONTENT ---
{page_text}
--- END FETCHED PAGE CONTENT ---

Design a sequential treasure hunt with exactly {hunt_input.numClues} clues. Each answer must be a specific
short word or phrase present in, or clearly inferable from, the fetched content.
Set every locationFound to false. The finalAnswer should normally equal the last
clue's answer. Include realistic confidence and integer counts for pages, blogs,
and products identified in the content. Use any live Graph recommendations above
as defaults when they do not conflict with the creator's request. Return only the
structured JSON."""


def _regenerate_clue_prompt(clue: AIGeneratedClue, business_name: str, business_url: str, page_text: str) -> str:
    return f"""Revise one clue in a sequential treasure hunt for "{business_name}" ({business_url}).

Current clue:
{clue.model_dump()}

REAL visible website content:
--- BEGIN FETCHED PAGE CONTENT ---
{page_text}
--- END FETCHED PAGE CONTENT ---

Generate one alternative clue for the same order and general location. Use a
different text and answer, but keep the answer grounded in the fetched content.
Set locationFound to false and return only the structured JSON."""


def _request_json(prompt: str, schema_cls: Type[BaseModel]) -> BaseModel:
    settings = _get_settings()
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "format": schema_cls.model_json_schema(),
        "options": {"temperature": 0.4},
    }
    try:
        base_url = settings.OLLAMA_BASE_URL.rstrip('/')
        endpoint = base_url if base_url.endswith('/api/chat') else f"{base_url}/api/chat"
        response = httpx.post(
            endpoint,
            json=payload,
            timeout=180,
        )
        response.raise_for_status()
        content = response.json().get("message", {}).get("content")
    except (httpx.HTTPError, ValueError) as exc:
        raise OllamaGenerationError(f"Ollama request failed: {exc}") from exc

    if not content:
        raise OllamaGenerationError("Ollama returned an empty response")
    try:
        return schema_cls.model_validate_json(content)
    except Exception as exc:
        raise OllamaGenerationError(f"Ollama returned unparseable JSON: {exc}") from exc


def generate_hunt(hunt_input: AIHuntGenerationInput, page_text: str) -> dict:
    draft = _request_json(
        _hunt_generation_prompt(hunt_input, page_text), _OllamaHuntDraft
    )
    result = draft.model_dump()
    result["difficulty"] = hunt_input.difficulty
    result["huntType"] = hunt_input.huntType
    return result


def regenerate_clue(clue: AIGeneratedClue, business_name: str, business_url: str, page_text: str) -> dict:
    new_clue = _request_json(
        _regenerate_clue_prompt(clue, business_name, business_url, page_text),
        AIGeneratedClue,
    )
    new_clue.order = clue.order
    return new_clue.model_dump()
