import json
from app.services.llm import llm
from app.models.schemas import InterviewerAgent
from app.prompts.interview import SETUP_SYSTEM, SETUP_USER


async def generate_interviewers(resume_text: str, jd_text: str, mode: str = "1v1") -> list[InterviewerAgent]:
    mode_label = "1v1 单独面试" if mode == "1v1" else "panel 多角色群面"
    user_msg = SETUP_USER.format(mode=mode_label, resume_text=resume_text[:2000], jd_text=jd_text[:3000])
    response = await llm.chat_json(SETUP_SYSTEM, user_msg, temperature=0.5)
    data = json.loads(response)
    return [InterviewerAgent(**item) for item in data["interviewers"]]
