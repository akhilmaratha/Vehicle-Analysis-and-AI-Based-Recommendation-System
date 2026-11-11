"""Phase 4.1 — Gemini client configuration and error mapping."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.services.gemini_client import (
    GeminiAuthError,
    GeminiClient,
    GeminiConfigError,
    GeminiQuotaError,
    GeminiResponseError,
    GeminiTimeoutError,
    parse_json_content,
    reset_gemini_client,
)


@pytest.fixture(autouse=True)
def _reset_client():
    reset_gemini_client()
    yield
    reset_gemini_client()


def test_parse_json_content_plain_and_fenced():
    assert parse_json_content('{"a": 1}') == {"a": 1}
    assert parse_json_content('```json\n{"b": 2}\n```') == {"b": 2}


def test_parse_json_content_invalid():
    with pytest.raises(GeminiResponseError):
        parse_json_content("not-json")
    with pytest.raises(GeminiResponseError):
        parse_json_content("")
    with pytest.raises(GeminiResponseError):
        parse_json_content("[1, 2]")


def test_missing_api_key_raises_config_error():
    client = GeminiClient(api_key="")
    with pytest.raises(GeminiConfigError):
        client.ensure_configured()


def test_generate_json_success():
    client = GeminiClient(api_key="test-key", model="gemini-3.5-flash-lite", timeout_seconds=5)
    mock_response = MagicMock()
    mock_response.text = '{"ok": true}'
    mock_models = MagicMock()
    mock_models.generate_content.return_value = mock_response
    mock_sdk_client = MagicMock()
    mock_sdk_client.models = mock_models

    with patch("google.genai.Client", return_value=mock_sdk_client):
        with patch("google.genai.types.HttpOptions", return_value=MagicMock()):
            with patch("google.genai.types.GenerateContentConfig", return_value=MagicMock()):
                result = client.generate_json("prompt")

    assert result == {"ok": True}
    mock_models.generate_content.assert_called_once()


def test_timeout_mapped():
    client = GeminiClient(api_key="test-key")
    mock_models = MagicMock()
    mock_models.generate_content.side_effect = TimeoutError("timed out")
    mock_sdk_client = MagicMock()
    mock_sdk_client.models = mock_models
    client._client = mock_sdk_client

    with patch("google.genai.types.GenerateContentConfig", return_value=MagicMock()):
        with pytest.raises(GeminiTimeoutError):
            client.generate_text("x")


def test_quota_mapped():
    client = GeminiClient(api_key="test-key")
    mock_models = MagicMock()
    mock_models.generate_content.side_effect = RuntimeError("429 RESOURCE_EXHAUSTED quota")
    mock_sdk_client = MagicMock()
    mock_sdk_client.models = mock_models
    client._client = mock_sdk_client

    with patch("google.genai.types.GenerateContentConfig", return_value=MagicMock()):
        with pytest.raises(GeminiQuotaError):
            client.generate_text("x")


def test_auth_mapped():
    client = GeminiClient(api_key="bad-key")
    mock_models = MagicMock()
    mock_models.generate_content.side_effect = RuntimeError("401 invalid API key")
    mock_sdk_client = MagicMock()
    mock_sdk_client.models = mock_models
    client._client = mock_sdk_client

    with patch("google.genai.types.GenerateContentConfig", return_value=MagicMock()):
        with pytest.raises(GeminiAuthError):
            client.generate_text("x")


def test_empty_response_error():
    client = GeminiClient(api_key="test-key")
    mock_response = MagicMock()
    mock_response.text = None
    mock_response.candidates = []
    mock_models = MagicMock()
    mock_models.generate_content.return_value = mock_response
    mock_sdk_client = MagicMock()
    mock_sdk_client.models = mock_models
    client._client = mock_sdk_client

    with patch("google.genai.types.GenerateContentConfig", return_value=MagicMock()):
        with pytest.raises(GeminiResponseError):
            client.generate_text("x")
