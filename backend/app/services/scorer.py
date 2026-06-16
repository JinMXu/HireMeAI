import json
from app.services.llm import llm
from app.models.schemas import ScoreResult
from app.prompts.scoring import SCORING_SYSTEM, SCORING_USER


async def score_resume(resume_text: str) -> ScoreResult:
    user_msg = SCORING_USER.format(resume_text=resume_text)
    response = await llm.chat_json(SCORING_SYSTEM, user_msg)
    data = json.loads(response)
    return ScoreResult(**data)
