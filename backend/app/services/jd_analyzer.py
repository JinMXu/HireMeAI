import json
import logging
from app.services.llm import llm
from app.models.schemas import MatchResult, JDOptimizeResult
from app.prompts.jd_match import (
    JD_MATCH_SYSTEM, JD_MATCH_USER,
    JD_OPTIMIZE_SYSTEM, JD_OPTIMIZE_USER,
)

logger = logging.getLogger(__name__)


async def analyze_jd_match(resume_text: str, jd_text: str) -> MatchResult:
    user_msg = JD_MATCH_USER.format(resume_text=resume_text, jd_text=jd_text)
    response = await llm.chat_json(JD_MATCH_SYSTEM, user_msg)
    try:
        data = json.loads(response)
    except json.JSONDecodeError:
        logger.error("JD match JSON parse failed. Raw response: %s", response[:500])
        raise RuntimeError("LLM 返回了无效的 JSON 格式，请重试")
    return MatchResult(**data)


async def optimize_for_jd(resume_text: str, jd_text: str) -> JDOptimizeResult:
    user_msg = JD_OPTIMIZE_USER.format(resume_text=resume_text, jd_text=jd_text)
    response = await llm.chat_json(JD_OPTIMIZE_SYSTEM, user_msg)
    try:
        data = json.loads(response)
    except json.JSONDecodeError:
        logger.error("JD optimize JSON parse failed. Raw response: %s", response[:500])
        raise RuntimeError("LLM 返回了无效的 JSON 格式，请重试")
    return JDOptimizeResult(**data)
