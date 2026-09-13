"""Gemini 2.5 Flash client wrapper producing structured, JSON-schema-constrained
hunt drafts grounded in real fetched page content, or in a business-provided
free-text description when no website is scraped.

This is the "real AI" replacement for the old hardcoded template generator.
Nothing here is ever persisted to the database — the plaintext `answer` on
each clue is a draft returned straight to the creator's browser for review.
"""
from typing import List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.config import get_settings
from app.schemas import AIGeneratedClue, AIHuntGenerationInput


class GeminiConfigError(RuntimeError):
    """Raised when GEMINI_API_KEY is not configured."""


class GeminiGenerationError(RuntimeError):
    """Raised when Gemini fails to return a parseable structured response."""


# Schema Gemini is constrained to emit for a full hunt draft. `difficulty` and
# `huntType` are deliberately excluded: those are inputs the caller already
# chose, so we pass them straight through rather than asking the model to
# reconstruct them (avoids inconsistency between what was requested and what
# comes back).
class _GeminiHuntDraft(BaseModel):
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


def _get_client() -> genai.Client:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        raise GeminiConfigError(
            "GEMINI_API_KEY is not set. An operator must configure it in the backend's "
            "environment (.env) for /api/ai/* endpoints to work."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _hunt_generation_prompt(hunt_input: AIHuntGenerationInput, source_text: str, is_scraped: bool) -> str:
    if is_scraped:
        source_heading = "the REAL visible text content fetched from the business's own website (businessUrl)"
        grounding_note = (
            "It has been stripped of scripts/styles/navigation and truncated.\n"
            "You MUST ground every clue in this actual content — do not invent products,\n"
            "pages, or facts that are not present in or clearly inferable from this text."
        )
        location_note = (
            "Each clue's `location` should point to a specific real page/section of the "
            "business's website (use `location.url`, `location.page`, `location.section`, "
            "`location.label`), matching where in the fetched content its answer is grounded."
        )
    else:
        source_heading = "a description the business owner provided of their own business (no website was scraped)"
        grounding_note = (
            "No real webpage was fetched — ground every clue in the themes, products, and "
            "facts actually stated in this description. Do not invent specific page content "
            "or facts that aren't implied by it."
        )
        location_note = (
            "Since there is no real webpage to point to, leave `location.url` empty and use "
            "`location.page`/`location.section`/`location.label` to describe a plausible "
            "real-world or social placement instead (e.g. an Instagram caption, an in-store "
            "window sticker, a receipt footer, an email newsletter)."
        )

    graph_context = ""
    if hunt_input.graphContext:
        graph_context = "\n" + str(hunt_input.graphContext.get("promptBlock") or hunt_input.graphContext) + "\n"

    return f"""You are designing a real-world/online "treasure hunt" marketing campaign for a
business, to be played by users who engage with the business's own content.

Business name: {hunt_input.businessName}
Business type: {hunt_input.businessType}
Business URL: {hunt_input.businessUrl or "not provided"}
Campaign goal: {hunt_input.campaign}
Target audience: {hunt_input.targetAudience}
Marketing channels: {", ".join(hunt_input.channels) or "not specified"}
Desired difficulty: {hunt_input.difficulty}
Suggested prize (ETH): {hunt_input.prize}
{graph_context}

Below is {source_heading}.
{grounding_note}

--- BEGIN SOURCE MATERIAL ---
{source_text}
--- END SOURCE MATERIAL ---

Design a sequential treasure hunt with EXACTLY {hunt_input.numClues} clues.
Requirements:

1. Each clue's `answer` MUST be a specific short word or phrase that actually
   appears in (or is clearly and unambiguously inferable from) the source
   material above. Never invent an answer that isn't grounded in it.
2. Clues must be genuinely SEQUENTIAL: clue N's text/hint should only make
   sense to solve after having found clue N-1's answer, and each clue should
   thematically progress deeper through the business's real content/story.
   Do not make the clues independent or randomly ordered.
3. {location_note}
4. `placementInstruction` should describe, for the merchant, literally where
   to physically place/reveal this clue (e.g. "add as a hidden note near the
   pricing section", or "print on the receipt footer").
5. `reason` should explain briefly why this clue/location was chosen.
6. `merchantAction` should describe any action the merchant must take to make
   the clue findable (e.g. "no action needed, content already public" or "add
   a QR code sticker near the store's front window").
7. `locationFound` must always be false (it is only set at play-time).
8. `finalAnswer` is the overall hunt-completion phrase — normally identical to
   the answer of the last clue.
9. `confidence` (0-1) should reflect how well-grounded the generated hunt is in
   the source material (lower it if it was thin, e.g. a very short description).
10. `analysedPages`, `analysedBlogs`, `analysedProducts` are rough integer
   counts of how many distinct pages/blog posts/products you could identify
   references to within the source material (0 if none — this will usually be
   0 when working from a plain description rather than a scraped website).
11. `suggestedPrize` MUST be a plain decimal number as a string (e.g. "0.05"),
   with no currency unit, symbol, or extra text of any kind.
12. If live Graph recommendations were provided above, use them as defaults for
   clue count, difficulty, hunt type, and prize unless the creator's explicit
   form choices conflict with the source material.

Return ONLY the structured JSON described by the response schema."""


def _regenerate_clue_prompt(
    clue: AIGeneratedClue, business_name: str, business_url: Optional[str], source_text: str, is_scraped: bool
) -> str:
    business_label = f'"{business_name}" ({business_url})' if business_url else f'"{business_name}"'
    source_heading = (
        "the REAL visible text content fetched from the business's own website"
        if is_scraped
        else "the description the business owner provided of their own business (no website was scraped)"
    )

    return f"""You are revising ONE clue in an existing sequential treasure hunt for the
business {business_label}.

The current clue at this position is:
  text: {clue.text}
  answer: {clue.answer}
  location: {clue.location.model_dump()}
  placementInstruction: {clue.placementInstruction}
  reason: {clue.reason}
  merchantAction: {clue.merchantAction}

Below is {source_heading}. It has been stripped/truncated where applicable.

--- BEGIN SOURCE MATERIAL ---
{source_text}
--- END SOURCE MATERIAL ---

Generate ONE alternative clue that:
- Targets the SAME general location/step in the hunt (same `order`, similar
  `location`), so it can be swapped in-place for the current clue.
- Has a different `text`/`answer` (a fresh take), but its `answer` MUST still
  be a specific short word or phrase that actually appears in (or is clearly
  inferable from) the source material near that location.
- Keeps `locationFound` as false.

Return ONLY the structured JSON for this single clue, matching the response schema."""


def generate_hunt(hunt_input: AIHuntGenerationInput, source_text: str, is_scraped: bool = True) -> dict:
    """Call Gemini 2.5 Flash to produce a structured hunt draft.

    `source_text` is either real fetched website content (`is_scraped=True`)
    or a business-provided free-text description (`is_scraped=False`).

    Returns a plain dict matching the `AIGeneratedHunt` schema shape (with
    `difficulty`/`huntType` merged back in from the request). Raises
    GeminiConfigError / GeminiGenerationError on failure.
    """
    settings = get_settings()
    client = _get_client()
    prompt = _hunt_generation_prompt(hunt_input, source_text, is_scraped)

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_GeminiHuntDraft,
            ),
        )
    except Exception as exc:  # network/SDK errors
        raise GeminiGenerationError(f"Gemini request failed: {exc}") from exc

    draft = _parse_response(response, _GeminiHuntDraft)

    result = draft.model_dump()
    result["difficulty"] = hunt_input.difficulty
    result["huntType"] = hunt_input.huntType
    return result


def regenerate_clue(
    clue: AIGeneratedClue,
    business_name: str,
    source_text: str,
    is_scraped: bool = True,
    business_url: Optional[str] = None,
) -> dict:
    """Call Gemini 2.5 Flash to produce a single alternative clue."""
    settings = get_settings()
    client = _get_client()
    prompt = _regenerate_clue_prompt(clue, business_name, business_url, source_text, is_scraped)

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIGeneratedClue,
            ),
        )
    except Exception as exc:
        raise GeminiGenerationError(f"Gemini request failed: {exc}") from exc

    new_clue = _parse_response(response, AIGeneratedClue)
    new_clue.order = clue.order
    return new_clue.model_dump()


def _parse_response(response, schema_cls):
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, schema_cls):
        return parsed
    text = getattr(response, "text", None)
    if not text:
        raise GeminiGenerationError("Gemini returned an empty response")
    try:
        return schema_cls.model_validate_json(text)
    except Exception as exc:
        raise GeminiGenerationError(f"Gemini returned unparseable JSON: {exc}") from exc
