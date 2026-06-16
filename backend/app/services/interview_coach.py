from app.services.llm import llm
from app.prompts.interview import COACH_SYSTEM


async def generate_coaching_tip(
    interviewer_name: str, interviewer_title: str, candidate_answer: str
) -> str:
    system = COACH_SYSTEM.format(
        interviewer_name=interviewer_name, interviewer_title=interviewer_title
    )
    tip = await llm.chat(system, f"候选人的回答：{candidate_answer}", temperature=0.5)
    return tip.strip()
