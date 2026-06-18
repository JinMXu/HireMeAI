import asyncio
import re
import uuid
import json
import logging
from typing import AsyncGenerator
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import SelectorGroupChat, RoundRobinGroupChat
from autogen_agentchat.conditions import MaxMessageTermination
from autogen_agentchat.messages import TextMessage
from app.services.llm import llm
from app.models.schemas import InterviewerAgent, InterviewMessage
from app.prompts.interview import HISTORY_SUMMARY_SYSTEM, HISTORY_SUMMARY_USER, OPENING_SYSTEM, OPENING_USER
from app.utils.session import create_interview_session, get_interview_session, delete_interview_session
from app.utils.db import save_interview_message as db_save_message

logger = logging.getLogger(__name__)

# Trigger context rebuild when message_history exceeds this
CONTEXT_REBUILD_THRESHOLD = 18
# How many recent messages to keep in full when rebuilding
RECENT_WINDOW = 6
# Hard message limit (per-AutoGen-run safety net)
HARD_MESSAGE_LIMIT = 30
# Per-chunk timeout in seconds
STREAM_CHUNK_TIMEOUT = 30

DIFFICULTY_HINTS = {
    "beginner": "保持友好和引导式提问，多给鼓励。",
    "intermediate": "模拟正常面试节奏，适时追问。",
    "advanced": "进行深度追问和压力测试，挑战候选人的极限。",
}

CORE_RULES = (
    "【核心规则 — 必须严格遵守】\n"
    "1. 你只负责提问和追问，绝对不要替候选人回答，不要生成候选人的回复内容。\n"
    "2. 每次只输出1-2个问题，回复简洁（控制在100字以内）。\n"
    "3. 不要长篇大论讲技术方案，你的职责是提问和评估，不是授课。\n"
    "4. 根据候选人的回答逐步深入追问，若候选人已答过则不要重复问相同问题。\n"
    "5. 只输出你作为面试官要说的话，不要模拟整个对话过程。\n"
    "6. 当你认为面试已充分覆盖所有关键领域、可以做出评估时，请在最后说'【面试结束】'并给出一句简短的面试总结。"
)

_CANDIDATE_IMPERSONATION_PATTERNS = [
    r"[。？?!！]\s*好的[。，]\s*(我是|我叫|我之前|我从事|我有|我在|我做过|我目前|我来|让我|我做|我先).*$",
    r"[。？?!！]\s*嗯[。，]\s*(我是|我叫|我之前|我从事|我有|我在|我做过|我先).*$",
    r"[。？?!！]\s*行[。，]\s*(我是|我叫|我之前|我从事|我).*$",
    r"[。？?!！]\s*可以[。，]\s*(我是|我叫|我之前|我从事).*$",
]


def _clean_reply(text: str) -> str:
    """Strip think tags, termination markers, and candidate impersonation."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
    unclosed = text.find("<think>")
    if unclosed != -1:
        text = text[:unclosed]
    text = text.replace("<<END>>", "").replace("TERMINATE", "")
    for pattern in _CANDIDATE_IMPERSONATION_PATTERNS:
        text = re.sub(pattern, "", text)
    return text.strip()


def _format_history(messages: list[dict]) -> str:
    """Format message history as readable conversation text."""
    lines = []
    for m in messages:
        role_label = m.get("agent_name", "面试官") if m["role"] == "interviewer" else "候选人"
        lines.append(f"{role_label}: {m['content']}")
    return "\n".join(lines)


def _build_system_message(iv: InterviewerAgent, difficulty: str, context_summary: str = "", recent_history: str = "") -> str:
    """Build the full system_message for an interviewer agent."""
    parts = [
        iv.system_prompt,
        f"面试难度：{DIFFICULTY_HINTS.get(difficulty, '')}",
        CORE_RULES,
    ]
    if context_summary:
        parts.append(f"【之前的对话摘要】\n{context_summary}")
    if recent_history:
        parts.append(f"【最近的对话记录】\n{recent_history}")
    return "\n\n".join(parts)


class InterviewChatManager:
    def __init__(self):
        self.model_client = llm.create_autogen_client()

    # ── agent / team factories ────────────────────────────────────

    def _create_agent(self, iv: InterviewerAgent, difficulty: str, context_summary: str = "", recent_history: str = "") -> AssistantAgent:
        """Create a single interviewer agent (1v1 mode)."""
        return AssistantAgent(
            name=iv.id,
            model_client=self.model_client,
            model_client_stream=True,
            description=f"{iv.title} - {iv.style}",
            system_message=_build_system_message(iv, difficulty, context_summary, recent_history),
        )

    def _create_team(self, interviewers: list[InterviewerAgent], mode: str, difficulty: str, context_summary: str = "", recent_history: str = ""):
        """Create agents + GroupChat (panel mode). Each agent speaks at most once per run_stream call."""
        agents = []
        for iv in interviewers:
            agents.append(self._create_agent(iv, difficulty, context_summary, recent_history))

        termination = MaxMessageTermination(HARD_MESSAGE_LIMIT)
        num_agents = len(agents)

        # max_turns=1: one interviewer speaks per candidate message.
        # RoundRobin rotates across turns; Selector picks the most relevant.
        if mode == "panel" and num_agents > 3:
            team = SelectorGroupChat(
                participants=agents, model_client=self.model_client,
                termination_condition=termination, allow_repeated_speaker=False,
                max_turns=1,
            )
        else:
            team = RoundRobinGroupChat(
                participants=agents, termination_condition=termination,
                max_turns=1,
            )
        return team, agents

    # ── helpers ───────────────────────────────────────────────────

    @staticmethod
    async def _summarize_history(messages: list[dict]) -> str:
        conv_text = _format_history(messages)
        try:
            summary = await llm.chat(HISTORY_SUMMARY_SYSTEM, HISTORY_SUMMARY_USER.format(conversation=conv_text), temperature=0.3)
            return summary.strip()
        except Exception:
            logger.warning("Failed to summarize history.")
            return conv_text[-300:]

    @staticmethod
    async def _generate_opening(iv_name: str, iv_title: str, difficulty: str, resume_text: str, jd_text: str) -> str:
        try:
            opening = await llm.chat(
                OPENING_SYSTEM,
                OPENING_USER.format(resume_text=resume_text[:1500], jd_text=jd_text[:1500], interviewer_name=iv_name, interviewer_title=iv_title, difficulty=difficulty),
                temperature=0.6,
            )
            result = opening.strip()
            if result:
                return result
        except Exception:
            logger.warning("Failed to generate opening.")
        return f"你好！我是{iv_title}{iv_name}，欢迎参加今天的面试。请先简单介绍一下你自己。"

    # ── lifecycle ─────────────────────────────────────────────────

    async def start_interview(
        self, session_id: str, interviewers: list[InterviewerAgent],
        mode: str, difficulty: str, resume_text: str = "", jd_text: str = "",
    ) -> tuple[str, InterviewMessage]:
        interview_id = uuid.uuid4().hex[:12]
        first_iv = interviewers[0]

        if mode == "1v1":
            agent = self._create_agent(first_iv, difficulty)
            team = None
        else:
            team, agents = self._create_team(interviewers, mode, difficulty)
            agent = None

        create_interview_session(interview_id, {
            "agent": agent,
            "team": team,
            "message_history": [],
            "interviewers": interviewers,
            "mode": mode,
            "difficulty": difficulty,
            "session_id": session_id,
            "is_processing": False,
        })

        opening = await self._generate_opening(first_iv.name, first_iv.title, difficulty, resume_text, jd_text)
        first_message = InterviewMessage(
            role="interviewer", agent_id=first_iv.id,
            agent_name=f"{first_iv.name}（{first_iv.title}）", content=opening,
        )
        first_msg = first_message.model_dump()
        session = get_interview_session(interview_id)
        if session:
            session["message_history"].append(first_msg)
        db_save_message(interview_id, first_msg)
        return interview_id, first_message

    async def send_message_stream(self, interview_id: str, content: str) -> AsyncGenerator[str, None]:
        session = get_interview_session(interview_id)
        if not session:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Interview not found'})}\n\n"
            return
        if session.get("_runtime_missing"):
            yield f"data: {json.dumps({'type': 'error', 'message': '面试运行状态已丢失，请结束当前面试生成报告，或重新开始一场面试。'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return
        if session.get("is_processing"):
            yield f"data: {json.dumps({'type': 'error', 'message': '面试官还在思考上一个问题，请稍候...'})}\n\n"
            return
        session["is_processing"] = True
        try:
            async for event in self._run_message_stream(session, content, interview_id):
                yield event
        except Exception as exc:
            logger.exception("Unexpected error in message stream")
            yield f"data: {json.dumps({'type': 'error', 'message': '处理消息时出错，请重试。'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
        finally:
            session["is_processing"] = False

    async def _run_message_stream(self, session: dict, content: str, interview_id: str) -> AsyncGenerator[str, None]:
        message_history: list[dict] = session["message_history"]
        mode: str = session["mode"]
        interviewers: list[InterviewerAgent] = session["interviewers"]
        difficulty: str = session.get("difficulty", "intermediate")

        # 1. Save candidate message
        msg = {"role": "candidate", "content": content}
        message_history.append(msg)
        db_save_message(interview_id, msg)

        # 2. Maybe rebuild agent/team with summarized context
        if len(message_history) > CONTEXT_REBUILD_THRESHOLD:
            old = message_history[:-RECENT_WINDOW]
            context_summary = await self._summarize_history(old)
            recent = message_history[-RECENT_WINDOW:]
            recent_history = _format_history(recent)

            if mode == "1v1":
                session["agent"] = self._create_agent(interviewers[0], difficulty, context_summary, recent_history)
            else:
                team, _ = self._create_team(interviewers, mode, difficulty, context_summary, recent_history)
                session["team"] = team

        candidate_msg = TextMessage(content=content, source="candidate")
        yield f"data: {json.dumps({'type': 'status', 'message': '面试官正在思考...'})}\n\n"

        # 3. Run: agent.run_stream for 1v1, team.run_stream for panel
        if mode == "1v1":
            agent: AssistantAgent = session["agent"]
            stream = agent.run_stream(task=candidate_msg)
        else:
            team = session["team"]
            stream = team.run_stream(task=candidate_msg)

        chunk_buffer = []
        reply_agent_id = None
        task_result = None
        yielded_clean_len = 0

        try:
            stream_iter = stream.__aiter__()
            while True:
                try:
                    message = await asyncio.wait_for(anext(stream_iter), timeout=STREAM_CHUNK_TIMEOUT)
                except StopAsyncIteration:
                    break
                except asyncio.TimeoutError:
                    close = getattr(stream_iter, "aclose", None)
                    if close:
                        await close()
                    yield f"data: {json.dumps({'type': 'error', 'message': '面试官回复超时，请重试'}, ensure_ascii=False)}\n\n"
                    yield "data: [DONE]\n\n"
                    return
                if hasattr(message, "content") and hasattr(message, "type") and message.type == "ModelClientStreamingChunkEvent":
                    chunk_buffer.append(message.content)
                    if hasattr(message, "source") and message.source not in ("candidate", "user"):
                        reply_agent_id = reply_agent_id or message.source

                    raw = "".join(chunk_buffer)
                    clean = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL)
                    unclosed = clean.find("<think>")
                    if unclosed != -1:
                        clean = clean[:unclosed]
                    if len(clean) > yielded_clean_len:
                        new_content = clean[yielded_clean_len:]
                        yielded_clean_len = len(clean)
                        yield f"data: {json.dumps({'type': 'chunk', 'content': new_content, 'agent_id': reply_agent_id}, ensure_ascii=False)}\n\n"

                elif hasattr(message, "source") and message.source not in ("candidate", "user") and not hasattr(message, "type"):
                    if not reply_agent_id:
                        reply_agent_id = message.source
                        interviewer = next((i for i in interviewers if i.id == reply_agent_id), None)
                        display = f"{interviewer.name}（{interviewer.title}）" if interviewer else reply_agent_id
                        yield f"data: {json.dumps({'type': 'status', 'message': f'{display} 正在回复...'})}\n\n"

                if hasattr(message, "messages"):
                    task_result = message

        except Exception as exc:
            logger.exception("Stream iteration error")
            yield f"data: {json.dumps({'type': 'error', 'message': '面试官回复中断，请重试。'}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"
            return

        # 4. Build final reply
        reply_text = "".join(chunk_buffer)
        if not reply_text and task_result:
            all_messages = task_result.messages if task_result else []
            for msg in reversed(all_messages):
                if hasattr(msg, "source") and msg.source not in ("candidate", "user"):
                    reply_text = msg.content if hasattr(msg, "content") else str(msg)
                    reply_agent_id = reply_agent_id or msg.source
                    break

        reply_text = _clean_reply(reply_text)

        # 5. Smart ending
        is_complete = False
        if "【面试结束】" in reply_text:
            is_complete = True
            reply_text = reply_text.replace("【面试结束】", "").strip()
        # Only treat hard message limit as auto-complete — max_turns is expected per-turn behavior
        if not is_complete and task_result is not None and task_result.stop_reason is not None:
            reason = str(task_result.stop_reason).lower()
            is_complete = "max" in reason and "turn" not in reason

        if not reply_text:
            reply_text = "好的，感谢你的回答。面试到此结束，感谢你的参与！" if is_complete else "好的，感谢你的回答。"

        # 6. Resolve interviewer
        interviewer = next((i for i in interviewers if i.id == reply_agent_id), interviewers[0])

        # 7. Store reply
        reply_msg = {
            "role": "interviewer", "agent_id": reply_agent_id,
            "agent_name": f"{interviewer.name}（{interviewer.title}）", "content": reply_text,
        }
        message_history.append(reply_msg)
        db_save_message(interview_id, reply_msg)

        reply = InterviewMessage(
            role="interviewer", agent_id=reply_agent_id,
            agent_name=f"{interviewer.name}（{interviewer.title}）" if interviewer else None,
            content=reply_text,
        )

        # 8. Yield reply immediately — coaching tip follows async
        yield f"data: {json.dumps({'type': 'reply', 'reply': reply.model_dump(), 'is_complete': is_complete, 'next_speaker_id': reply_agent_id}, ensure_ascii=False)}\n\n"

        if not is_complete:
            try:
                from app.services.interview_coach import generate_coaching_tip
                coaching_tip = await generate_coaching_tip(
                    interviewer.name if interviewer else "面试官",
                    interviewer.title if interviewer else "",
                    content,
                )
                if coaching_tip:
                    yield f"data: {json.dumps({'type': 'coaching_tip', 'content': coaching_tip}, ensure_ascii=False)}\n\n"
            except Exception:
                pass

        yield "data: [DONE]\n\n"

    async def end_interview(self, interview_id: str) -> list[dict]:
        session = get_interview_session(interview_id)
        if not session:
            return []
        history = session.get("message_history", [])
        delete_interview_session(interview_id)
        return history


interview_chat = InterviewChatManager()
