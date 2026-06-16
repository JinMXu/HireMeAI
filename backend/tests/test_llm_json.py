import pytest

from app.services.llm import LLMJSONError, LLMService


def test_extract_json_accepts_plain_object():
    raw = '{"score": 90, "items": ["a", "b"]}'

    assert LLMService._extract_json(raw) == raw


def test_extract_json_accepts_markdown_fence():
    raw = """```json
{"score": 90}
```"""

    assert LLMService._extract_json(raw) == '{"score": 90}'


def test_extract_json_finds_balanced_payload_in_mixed_text():
    raw = 'Here is the result: {"score": 90, "note": "ok"} Thanks.'

    assert LLMService._extract_json(raw) == '{"score": 90, "note": "ok"}'


def test_extract_json_rejects_invalid_payload():
    with pytest.raises(LLMJSONError):
        LLMService._extract_json("not json at all")
