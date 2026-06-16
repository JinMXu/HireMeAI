import pytest
from openai import APIConnectionError

from app.services.llm import LLMService


class _Completions:
    def __init__(self):
        self.calls = 0

    async def create(self, **_):
        self.calls += 1
        if self.calls == 1:
            raise APIConnectionError(request=None)
        return "ok"


class _Chat:
    def __init__(self):
        self.completions = _Completions()


class _Client:
    def __init__(self):
        self.chat = _Chat()


@pytest.mark.asyncio
async def test_create_completion_retries_transient_errors(monkeypatch):
    service = LLMService()
    client = _Client()
    service.client = client

    monkeypatch.setattr("app.services.llm.settings.llm_max_retries", 1)
    monkeypatch.setattr("app.services.llm.settings.llm_retry_base_seconds", 0)

    result = await service._create_completion(model="test", messages=[])

    assert result == "ok"
    assert client.chat.completions.calls == 2
