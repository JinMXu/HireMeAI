import json
from app.services.llm import llm
from app.models.schemas import InterviewResult
from app.prompts.interview import INTERVIEW_SYSTEM, INTERVIEW_USER


async def generate_interview_questions(resume_text: str, jd_text: str) -> InterviewResult:
    user_msg = INTERVIEW_USER.format(resume_text=resume_text, jd_text=jd_text)
    response = await llm.chat_json(INTERVIEW_SYSTEM, user_msg)
    data = json.loads(response)
    return InterviewResult(**data)
