"""Fetch a business's URL and reduce it to plain, visible text for grounding
AI hunt generation. Never fabricates content — callers must treat a
FetchError as a hard failure of the /api/ai/generate request.
"""
import re

import httpx
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 FindETHHuntBot/1.0"
)

MAX_CHARS = 8000
TIMEOUT_SECONDS = 10.0

DROP_TAGS = ("script", "style", "nav", "footer", "noscript", "svg", "header", "form")


class FetchError(Exception):
    """Raised when businessUrl content could not be fetched or parsed."""


async def fetch_page_text(url: str) -> str:
    """Fetch `url` and return truncated, whitespace-collapsed visible body text.

    Raises FetchError with a human-readable reason on any failure (timeout,
    connection/DNS error, or non-2xx status) — callers must surface this as an
    honest error, never fall back to fabricated content.
    """
    headers = {"User-Agent": USER_AGENT}
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT_SECONDS) as client:
            response = await client.get(url, headers=headers)
    except httpx.TimeoutException as exc:
        raise FetchError(f"request timed out after {TIMEOUT_SECONDS}s") from exc
    except httpx.ConnectError as exc:
        raise FetchError(f"connection failed (DNS/network error): {exc}") from exc
    except httpx.HTTPError as exc:
        raise FetchError(str(exc)) from exc

    if response.status_code >= 400:
        raise FetchError(f"received HTTP {response.status_code}")

    try:
        soup = BeautifulSoup(response.text, "html.parser")
    except Exception as exc:  # pragma: no cover - defensive
        raise FetchError(f"could not parse HTML: {exc}") from exc

    for tag in soup(DROP_TAGS):
        tag.decompose()

    body = soup.body or soup
    text = body.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        raise FetchError("page contained no extractable visible text")

    return text[:MAX_CHARS]
