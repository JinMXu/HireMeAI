import re
import logging
from openai import AsyncOpenAI
from autogen_ext.models.openai import OpenAIChatCompletionClient
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
        )
        self.model = settings.deepseek_model

    async def chat(self, system: str, user: str, temperature: float = 0.7) -> str:
        response = await self.client.chat.completions.create(
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
        raw = await self._call_with_format(system, user, temperature, json_mode=True)
        if raw and raw.strip():
            return self._extract_json(raw)

        # Fallback: retry without json_object format
        logger.warning("Empty response with json_object mode, retrying without...")
        raw = await self._call_with_format(system, user, temperature, json_mode=False)
        return self._extract_json(raw)

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
        response = await self.client.chat.completions.create(**kwargs)
        return self._strip_thinking(response.choices[0].message.content or "")

    @staticmethod
    def _extract_json(raw: str) -> str:
        """Strip markdown fences and extract JSON from LLM response."""
        text = raw.strip()
        # Remove ```json ... ``` fences
        m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
        if m:
            text = m.group(1).strip()
        return text

    @staticmethod
    def _strip_thinking(text: str | None) -> str:
        """Remove thinking tags from model output (DeepSeek-R1 / reasoning models)."""
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
