"""Gemini API client wrapper (Phase 4.1).

Uses the official ``google-genai`` SDK. API keys stay on the backend.
Never logs the raw API key.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


class GeminiError(Exception):
    """Base Gemini integration error."""

    def __init__(self, message: str, *, code: str = "gemini_error") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class GeminiConfigError(GeminiError):
    def __init__(self, message: str = "Gemini API key is not configured") -> None:
        super().__init__(message, code="gemini_not_configured")


class GeminiAuthError(GeminiError):
    def __init__(self, message: str = "Gemini API key is invalid") -> None:
        super().__init__(message, code="gemini_auth_error")


class GeminiQuotaError(GeminiError):
    def __init__(self, message: str = "Gemini API quota or rate limit exceeded") -> None:
        super().__init__(message, code="gemini_quota_error")


class GeminiTimeoutError(GeminiError):
    def __init__(self, message: str = "Gemini API request timed out") -> None:
        super().__init__(message, code="gemini_timeout")


class GeminiResponseError(GeminiError):
    def __init__(self, message: str = "Gemini returned an unusable response") -> None:
        super().__init__(message, code="gemini_response_error")


def _safe_error_detail(exc: BaseException) -> str:
    """Human-readable SDK error without API keys."""
    text = str(exc) or exc.__class__.__name__
    # Never echo credential-looking substrings if present in error payloads.
    text = re.sub(r"(?i)(api[_-]?key|authorization|bearer)\s*[:=]\s*\S+", r"\1=[redacted]", text)
    return text[:500]


def _classify_sdk_error(exc: BaseException) -> GeminiError:
    """Map SDK / HTTP exceptions to typed Gemini errors without leaking secrets."""
    text = str(exc) or exc.__class__.__name__
    lowered = text.lower()
    detail = _safe_error_detail(exc)

    if (
        isinstance(exc, TimeoutError)
        or "timeout" in lowered
        or "timed out" in lowered
        or "deadline_exceeded" in lowered
        or "deadline expired" in lowered
    ):
        return GeminiTimeoutError("Gemini API request timed out")

    if any(
        token in lowered
        for token in (
            "429",
            "resource_exhausted",
            "quota",
            "rate limit",
            "rate_limit",
            "too many requests",
        )
    ):
        return GeminiQuotaError("Gemini API quota or rate limit exceeded")

    if any(
        token in lowered
        for token in (
            "401",
            "403",
            "api key",
            "invalid api key",
            "unauthorized",
            "permission denied",
            "unauthenticated",
        )
    ):
        return GeminiAuthError("Gemini API key is invalid or unauthorized")

    if "404" in lowered or "not_found" in lowered or "no longer available" in lowered:
        return GeminiError(
            f"Gemini model unavailable or not found: {detail}",
            code="gemini_model_unavailable",
        )

    return GeminiError(f"Gemini API request failed: {detail}")


def _strip_code_fences(text: str) -> str:
    match = _JSON_FENCE_RE.search(text)
    if match:
        return match.group(1).strip()
    return text.strip()


def parse_json_content(text: str) -> Dict[str, Any]:
    """Parse model text into a JSON object; raise GeminiResponseError on failure."""
    if not text or not str(text).strip():
        raise GeminiResponseError("Gemini returned empty content")

    cleaned = _strip_code_fences(str(text))
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        # Attempt to salvage a leading/trailing JSON object.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                raise GeminiResponseError("Gemini returned invalid JSON") from exc
        else:
            raise GeminiResponseError("Gemini returned invalid JSON") from exc

    if not isinstance(data, dict):
        raise GeminiResponseError("Gemini JSON root must be an object")
    return data


class GeminiClient:
    """Thin wrapper around google.genai Client for JSON generation."""

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ) -> None:
        settings = get_settings()
        self.api_key = (api_key if api_key is not None else settings.GEMINI_API_KEY) or ""
        self.model = model or settings.GEMINI_MODEL
        self.timeout_seconds = (
            timeout_seconds
            if timeout_seconds is not None
            else float(settings.GEMINI_TIMEOUT_SECONDS)
        )
        self._client = None

    def ensure_configured(self) -> None:
        if not self.api_key.strip():
            raise GeminiConfigError()

    def _get_client(self):
        self.ensure_configured()
        if self._client is not None:
            return self._client
        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise GeminiError(
                "google-genai package is not installed",
                code="gemini_sdk_missing",
            ) from exc

        http_options = types.HttpOptions(timeout=int(self.timeout_seconds * 1000))
        self._client = genai.Client(api_key=self.api_key, http_options=http_options)
        return self._client

    def generate_text(self, prompt: str, *, system_instruction: Optional[str] = None) -> str:
        """Call Gemini and return response text."""
        client = self._get_client()
        try:
            from google.genai import types

            config_kwargs: Dict[str, Any] = {
                "temperature": 0.2,
                "response_mime_type": "application/json",
            }
            if system_instruction:
                config_kwargs["system_instruction"] = system_instruction

            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(**config_kwargs),
            )
        except GeminiError:
            raise
        except Exception as exc:  # noqa: BLE001 — map all SDK failures
            mapped = _classify_sdk_error(exc)
            logger.warning(
                "Gemini generate_content failed: %s — %s",
                mapped.code,
                mapped.message,
            )
            raise mapped from exc

        text = getattr(response, "text", None)
        if not text:
            # Some SDK versions expose candidates instead of .text
            try:
                candidates = getattr(response, "candidates", None) or []
                if candidates:
                    content = getattr(candidates[0], "content", None)
                    parts = getattr(content, "parts", None) or []
                    chunks = [getattr(p, "text", "") for p in parts if getattr(p, "text", None)]
                    text = "".join(chunks)
            except Exception:  # noqa: BLE001
                text = None

        if not text:
            raise GeminiResponseError("Gemini returned empty content")
        return text

    def generate_json(
        self,
        prompt: str,
        *,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate content and parse it as a JSON object."""
        text = self.generate_text(prompt, system_instruction=system_instruction)
        return parse_json_content(text)


_default_client: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Process-wide Gemini client (lazy)."""
    global _default_client
    if _default_client is None:
        _default_client = GeminiClient()
    return _default_client


def reset_gemini_client() -> None:
    """Reset cached client (for tests)."""
    global _default_client
    _default_client = None
