"""Gemini provider with the same draft contract as the Ollama provider."""
from pydantic import BaseModel

from app.config import get_settings
from app.schemas import AIGeneratedClue, AIHuntGenerationInput
from app.services.ollama import (
    _OllamaHuntDraft,
    _hunt_generation_prompt,
    _regenerate_clue_prompt,
)


class GeminiConfigError(RuntimeError):
    pass


class GeminiGenerationError(RuntimeError):
    pass


def _client():
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise GeminiConfigError(
            "GEMINI_API_KEY must be configured when AI_PROVIDER=gemini."
        )
    try:
        from google import genai
    except ImportError as exc:
        raise GeminiConfigError(
            "Install google-genai before using AI_PROVIDER=gemini."
        ) from exc
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _request(prompt: str, schema_cls: type[BaseModel]) -> BaseModel:
    settings = get_settings()
    client = None
    try:
        from google.genai import types

        # Keep a strong reference until the synchronous request has completed.
        client = _client()
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema_cls,
            ),
        )
    except GeminiConfigError:
        raise
    except Exception as exc:
        raise GeminiGenerationError(f"Gemini request failed: {exc}") from exc
    finally:
        if client is not None:
            client.close()

    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, schema_cls):
        return parsed
    text = getattr(response, "text", None)
    if not text:
        raise GeminiGenerationError("Gemini returned an empty response")
    try:
        return schema_cls.model_validate_json(text)
    except Exception as exc:
        raise GeminiGenerationError(f"Gemini returned invalid JSON: {exc}") from exc


def generate_hunt(hunt_input: AIHuntGenerationInput, page_text: str) -> dict:
    draft = _request(_hunt_generation_prompt(hunt_input, page_text), _OllamaHuntDraft)
    result = draft.model_dump()
    result["difficulty"] = hunt_input.difficulty
    result["huntType"] = hunt_input.huntType
    return result


def regenerate_clue(
    clue: AIGeneratedClue,
    business_name: str,
    business_url: str,
    page_text: str,
) -> dict:
    new_clue = _request(
        _regenerate_clue_prompt(clue, business_name, business_url, page_text),
        AIGeneratedClue,
    )
    new_clue.order = clue.order
    return new_clue.model_dump()
