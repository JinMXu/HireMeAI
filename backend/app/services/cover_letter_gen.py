import json
from typing import Optional
from app.services.llm import llm
from app.models.schemas import CoverLetterResult
from app.prompts.cover_letter import COVER_LETTER_SYSTEM, COVER_LETTER_USER


async def generate_cover_letter(
    resume_text: str,
    jd_text: str,
    company_name: Optional[str] = None,
    position_name: Optional[str] = None,
) -> CoverLetterResult:
    user_msg = COVER_LETTER_USER.format(
        resume_text=resume_text,
        jd_text=jd_text,
        company_name=company_name or "未指定",
        position_name=position_name or "未指定",
    )
    response = await llm.chat_json(COVER_LETTER_SYSTEM, user_msg)
    data = json.loads(response)
    return CoverLetterResult(**data)
