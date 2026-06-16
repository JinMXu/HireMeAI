import json
import asyncio
import random
import re
import logging
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)
from autogen_ext.models.openai import OpenAIChatCompletionClient
from app.config import settings

logger = logging.getLogger(__name__)


class LLMJSONError(RuntimeError):
    """Raised when the model response cannot be parsed as valid JSON."""


class LLMTransientError(RuntimeError):
    """Raised when the model API remains unavailable after retries."""


class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            max_retries=0,
            timeout=settings.llm_request_timeout_seconds,
        )
        self.model = settings.deepseek_model

    async def chat(self, system: str, user: str, temperature: float = 0.7) -> str:
        response = await self._create_completion(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
        return self._strip_thinking(response.choices[0].message.content)

    async def chat_json(self, system: str, user: str, temperature: float = 0.3) -> str:
        """Call LLM and extract valid JSON from the response.

        Handles models that don't fully support response_format=json_object
        by falling back to a plain call and extracting JSON from the text.
        """
        errors = []
        for json_mode in (True, False):
            raw = await self._call_with_format(system, user, temperature, json_mode=json_mode)
            try:
                return self._extract_json(raw)
            except LLMJSONError as exc:
                errors.append(str(exc))
                logger.warning(
                    "Invalid JSON response from LLM with json_mode=%s, retrying if possible.",
                    json_mode,
                )

        raise LLMJSONError("LLM returned invalid JSON after retries: " + " | ".join(errors))

    async def _call_with_format(
        self, system: str, user: str, temperature: float, json_mode: bool
    ) -> str:
        kwargs = dict(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = await self._create_completion(**kwargs)
        return self._strip_thinking(response.choices[0].message.content or "")

    async def _create_completion(self, **kwargs):
        last_error: Exception | None = None
        max_attempts = max(settings.llm_max_retries, 0) + 1

        for attempt in range(max_attempts):
            try:
                return await self.client.chat.completions.create(**kwargs)
            except (APIConnectionError, APITimeoutError, RateLimitError) as exc:
                last_error = exc
            except APIStatusError as exc:
                if not self._is_retryable_status(exc.status_code):
                    raise
                last_error = exc

            if attempt >= max_attempts - 1:
                break

            delay = self._retry_delay(attempt)
            logger.warning(
                "Transient LLM API error on attempt %s/%s; retrying in %.2fs: %s",
                attempt + 1,
                max_attempts,
                delay,
                type(last_error).__name__,
            )
            await asyncio.sleep(delay)

        raise LLMTransientError(
            f"LLM API unavailable after {max_attempts} attempts: {type(last_error).__name__}"
        ) from last_error

    @staticmethod
    def _is_retryable_status(status_code: int) -> bool:
        return status_code == 429 or status_code in {500, 502, 503, 504}

    @staticmethod
    def _retry_delay(attempt: int) -> float:
        base = max(settings.llm_retry_base_seconds, 0.0)
        jitter = random.uniform(0, base / 2) if base else 0.0
        return base * (2 ** attempt) + jitter

    @staticmethod
    def _extract_json(raw: str) -> str:
        """Strip markdown fences and extract JSON from LLM response."""
        text = raw.strip()
        if not text:
            raise LLMJSONError("empty response")

        # Remove ```json ... ``` fences
        m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if m:
            text = m.group(1).strip()

        try:
            json.loads(text)
            return text
        except json.JSONDecodeError:
            pass

        extracted = LLMService._find_json_payload(text)
        if extracted is None:
            raise LLMJSONError("no JSON object or array found")

        try:
            json.loads(extracted)
        except json.JSONDecodeError as exc:
            raise LLMJSONError(f"invalid JSON payload: {exc.msg}") from exc

        return extracted

    @staticmethod
    def _find_json_payload(text: str) -> str | None:
        """Return the first balanced JSON object or array from mixed text."""
        starts = [idx for idx in (text.find("{"), text.find("[")) if idx != -1]
        if not starts:
            return None

        start = min(starts)
        stack: list[str] = []
        in_string = False
        escaped = False

        for idx, char in enumerate(text[start:], start=start):
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
            elif char in "{[":
                stack.append("}" if char == "{" else "]")
            elif char in "}]":
                if not stack or char != stack[-1]:
                    return None
                stack.pop()
                if not stack:
                    return text[start:idx + 1].strip()

        return None

    @staticmethod
    def _strip_thinking(text: str | None) -> str:
        """Remove thinking tags from model output (reasoning models)."""
        if not text:
            return ""
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        unclosed = text.find("<think>")
        if unclosed != -1:
            text = text[:unclosed]
        return text.strip()

    def create_autogen_client(self) -> OpenAIChatCompletionClient:
        return OpenAIChatCompletionClient(
            model=settings.deepseek_model,
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model_info=settings.model_capabilities,
        )


llm = LLMService()
