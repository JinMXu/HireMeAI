import json
from app.services.llm import llm
from app.models.schemas import EvaluationReport
from app.prompts.interview import EVAL_SYSTEM, EVAL_USER


async def generate_evaluation(
    conversation: list[dict], resume_text: str, jd_text: str
) -> EvaluationReport:
    conv_text = "\n".join(
        f"{m.get('agent_name', '面试官')}: {m['content']}" if m['role'] == 'interviewer'
        else f"候选人: {m['content']}"
        for m in conversation
    )
    user_msg = EVAL_USER.format(
        conversation=conv_text, resume_text=resume_text, jd_text=jd_text
    )
    response = await llm.chat_json(EVAL_SYSTEM, user_msg, temperature=0.3)
    data = json.loads(response)
    return EvaluationReport(**data)
