import json
from app.services.llm import llm
from app.models.schemas import OptimizeResult
from app.prompts.optimization import OPTIMIZATION_SYSTEM, OPTIMIZATION_USER


async def optimize_resume(resume_text: str) -> OptimizeResult:
    user_msg = OPTIMIZATION_USER.format(resume_text=resume_text)
    response = await llm.chat_json(OPTIMIZATION_SYSTEM, user_msg)
    data = json.loads(response)
    return OptimizeResult(**data)
