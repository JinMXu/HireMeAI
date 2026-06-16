# 面试 Agent 对话系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将面试模块从"一次性生成面试题"改造为基于 Microsoft AutoGen 的 Agent 对话式模拟面试系统，支持 1v1 和群面两种模式。

**Architecture:** 后端使用 AutoGen 的 SelectorGroupChat 管理多 Agent 对话编排，ConversableAgent 定义面试官角色，UserProxyAgent 注入候选人消息。前端使用 shadcn/ui 构建聊天界面。AutoGen 管理对话状态和历史，应用层只维护会话元数据。

**Tech Stack:** FastAPI + AutoGen (autogen-agentchat + autogen-ext[openai]) + DeepSeek LLM + React + shadcn/ui

---

## 文件结构

```
backend/
├── app/
│   ├── models/
│   │   └── schemas.py          # [修改] 新增面试 Agent 相关模型
│   ├── routers/
│   │   └── interview.py        # [重写] 新 Agent 面试端点
│   ├── services/
│   │   ├── llm.py              # [修改] 暴露 model config 供 AutoGen 使用
│   │   ├── interview_setup.py  # [新建] JD 分析 + 面试官生成
│   │   ├── interview_chat.py   # [新建] AutoGen GroupChat 管理
│   │   ├── interview_coach.py  # [新建] 实时点拨生成
│   │   └── interview_eval.py   # [新建] 面试评估报告
│   ├── prompts/
│   │   └── interview.py        # [重写] 新 Agent 提示词
│   └── utils/
│       └── session.py          # [修改] Session 扩展储存面试数据
├── requirements.txt            # [修改] 新增 AutoGen 依赖
└── tests/
    └── test_interview.py       # [新建] 面试模块测试

frontend/
├── src/
│   ├── pages/
│   │   ├── InterviewPage.tsx        # [重写] 面试入口页（模式选择）
│   │   ├── InterviewChatPage.tsx    # [新建] 对话聊天页
│   │   └── InterviewReportPage.tsx  # [新建] 评估报告页
│   ├── components/
│   │   └── interview/
│   │       ├── InterviewSetup.tsx   # [新建] 面试设置面板
│   │       ├── RoleManager.tsx      # [新建] 角色管理组件
│   │       ├── ChatBubble.tsx       # [新建] 对话气泡
│   │       ├── CoachingTip.tsx      # [新建] 点拨提示条
│   │       └── ReportChart.tsx      # [新建] 评估雷达图
│   ├── api/
│   │   └── client.ts           # [修改] 新增面试 API 调用
│   └── App.tsx                 # [修改] 新增面试路由
```

---

### Task 1: 更新后端依赖 & LLM 服务暴露配置

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/app/services/llm.py`
- Modify: `backend/app/config.py`

- [ ] **Step 1: 添加 AutoGen 依赖到 `requirements.txt`**

在 `requirements.txt` 末尾追加：

```
autogen-agentchat>=0.7.0
autogen-ext[openai]>=0.7.0
```

- [ ] **Step 2: 安装新依赖**

```bash
cd D:/agents/HireMeAI/backend && pip install autogen-agentchat "autogen-ext[openai]" 2>&1 | tail -3
```

- [ ] **Step 3: 扩展 `app/config.py` — 添加 model capabilities 配置**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    max_file_size_mb: int = 10
    session_ttl_minutes: int = 60

    @property
    def model_capabilities(self) -> dict:
        return {
            "vision": False,
            "function_calling": False,
            "json_output": True,
            "family": "unknown",
        }

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 4: 扩展 `app/services/llm.py` — 暴露 AutoGen 用 model_client**

```python
from openai import AsyncOpenAI
from autogen_ext.models.openai import OpenAIChatCompletionClient
from app.config import settings


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
        return response.choices[0].message.content

    async def chat_json(self, system: str, user: str, temperature: float = 0.3) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content

    def create_autogen_client(self) -> OpenAIChatCompletionClient:
        """Create an AutoGen-compatible model client using DeepSeek config."""
        return OpenAIChatCompletionClient(
            model=settings.deepseek_model,
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model_info=settings.model_capabilities,
        )


llm = LLMService()
```

---

### Task 2: 创建面试 Agent 数据模型

**Files:**
- Modify: `backend/app/models/schemas.py`

- [ ] **Step 1: 在 `schemas.py` 末尾追加面试 Agent 模型**

```python
# ---- Interview Agent Models ----

class InterviewerAgent(BaseModel):
    id: str
    name: str
    title: str
    style: str
    focus_areas: list[str]
    system_prompt: str
    avatar: str = ""


class InterviewSetupRequest(BaseModel):
    session_id: str
    jd_text: str = Field(..., min_length=20)
    mode: str = Field(default="1v1", pattern="^(1v1|panel)$")
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced)$")


class InterviewSetupResponse(BaseModel):
    interviewers: list[InterviewerAgent]


class InterviewStartRequest(BaseModel):
    session_id: str
    interviewers: list[InterviewerAgent]
    mode: str = "1v1"
    difficulty: str = "intermediate"


class InterviewMessage(BaseModel):
    role: str  # "interviewer" | "candidate" | "system"
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    content: str
    coaching_tip: Optional[str] = None


class InterviewStartResponse(BaseModel):
    interview_id: str
    first_message: InterviewMessage


class InterviewMessageRequest(BaseModel):
    interview_id: str
    content: str


class InterviewMessageResponse(BaseModel):
    reply: InterviewMessage
    coaching_tip: Optional[str] = None
    is_complete: bool = False
    next_speaker_id: Optional[str] = None


class EvalDimension(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    feedback: str


class RoundReview(BaseModel):
    question_index: int
    question: str
    answer_summary: str
    rating: str
    feedback: str


class EvaluationReport(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    dimensions: list[EvalDimension]
    strengths: list[str]
    improvements: list[str]
    round_reviews: list[RoundReview]
    summary: str


class InterviewEndResponse(BaseModel):
    interview_id: str
    report: EvaluationReport
```

---

### Task 3: 创建面试提示词

**Files:**
- Rewrite: `backend/app/prompts/interview.py`

- [ ] **Step 1: 替换 `prompts/interview.py` 为 Agent 风格提示词**

```python
SETUP_SYSTEM = """你是一位资深招聘专家。根据职位描述(JD)分析该岗位需要面试哪些维度，
为每个维度生成一位面试官角色。

生成规则：
1. 必须包含一位 HR 面试官（行为面、文化适配、职业规划）
2. 根据 JD 内容，为每项关键能力域生成一位专业面试官
3. 如果 JD 提到管理/领导职责，增加一位管理面试官
4. 为每个面试官编写独立的系统提示词（人格描述+提问风格+专注领域）
5. 用中文命名

请严格返回以下JSON格式：
{
  "interviewers": [
    {
      "id": "hr_1",
      "name": "李姐",
      "title": "HR 面试官",
      "style": "行为面、文化适配",
      "focus_areas": ["沟通能力", "团队协作", "职业规划"],
      "system_prompt": "你是HR面试官李姐...",
      "avatar": "HR"
    }
  ]
}"""

SETUP_USER = """目标职位描述：
{jd_text}

候选人简历摘要：
{resume_text}"""


COACH_SYSTEM = """你是一位面试教练。候选人在接受{interviewer_name}（{interviewer_title}）的面试。
请根据候选人的回答，给出一条简短的改进建议（20字以内）。
聚焦于：回答结构的完整性、关键数据的补充、表达方式的优化。
不要评价内容好坏，只给建设性建议。直接输出建议文本。"""


EVAL_SYSTEM = """你是一位资深面试评估专家。请根据完整的面试对话记录，对候选人进行综合评估。

评分维度（每项0-100分）：
1. 沟通表达 — 清晰度、逻辑性、语言组织
2. 专业深度 — 对专业领域的理解和经验深度
3. 临场反应 — 应对追问和压力问题的表现
4. 文化适配 — 与JD中描述的企业文化的匹配度

生成规则：
- 给出总体评分
- 对每轮关键问答进行回顾点评
- 列出3-5个优势
- 列出3-5个改进建议（按优先级排序）
- 写一段总体评价总结

请严格返回以下JSON格式：
{
  "overall_score": 85,
  "dimensions": [
    {"name": "沟通表达", "score": 82, "feedback": "..."}
  ],
  "strengths": ["..."],
  "improvements": ["..."],
  "round_reviews": [
    {"question_index": 1, "question": "...", "answer_summary": "...", "rating": "优秀", "feedback": "..."}
  ],
  "summary": "..."
}"""

EVAL_USER = """面试对话记录：
{conversation}

候选人简历：
{resume_text}

目标职位描述：
{jd_text}"""
```

---

### Task 4: 创建 JD 分析 + 面试官生成服务

**Files:**
- Create: `backend/app/services/interview_setup.py`

- [ ] **Step 1: 创建 `services/interview_setup.py`**

```python
import json
from app.services.llm import llm
from app.models.schemas import InterviewerAgent
from app.prompts.interview import SETUP_SYSTEM, SETUP_USER


async def generate_interviewers(resume_text: str, jd_text: str) -> list[InterviewerAgent]:
    user_msg = SETUP_USER.format(resume_text=resume_text[:2000], jd_text=jd_text[:3000])
    response = await llm.chat_json(SETUP_SYSTEM, user_msg, temperature=0.5)
    data = json.loads(response)
    return [InterviewerAgent(**item) for item in data["interviewers"]]
```

---

### Task 5: 创建 AutoGen 对话管理服务

**Files:**
- Create: `backend/app/services/interview_chat.py`
- Modify: `backend/app/utils/session.py`

- [ ] **Step 1: 扩展 `session.py` — 添加面试会话存储**

```python
from typing import Optional

# 在 SessionData 的 extra 属性中存储面试会话
# 新增函数：

_interview_sessions: dict[str, dict] = {}


def create_interview_session(interview_id: str, data: dict) -> None:
    _interview_sessions[interview_id] = data


def get_interview_session(interview_id: str) -> Optional[dict]:
    return _interview_sessions.get(interview_id)


def delete_interview_session(interview_id: str) -> None:
    _interview_sessions.pop(interview_id, None)
```

- [ ] **Step 2: 创建 `services/interview_chat.py`**

```python
import uuid
from typing import Optional
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.teams import SelectorGroupChat, RoundRobinGroupChat
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.messages import TextMessage
from autogen_core import CancellationToken
from app.services.llm import llm
from app.models.schemas import InterviewerAgent, InterviewMessage
from app.utils.session import create_interview_session, get_interview_session, delete_interview_session


class InterviewChatManager:
    def __init__(self):
        self.model_client = llm.create_autogen_client()

    async def start_interview(
        self, session_id: str, interviewers: list[InterviewerAgent], mode: str, difficulty: str
    ) -> tuple[str, InterviewMessage]:
        interview_id = uuid.uuid4().hex[:12]

        agents = []
        for iv in interviewers:
            difficulty_hint = {
                "beginner": "保持友好和引导式提问，多给鼓励。",
                "intermediate": "模拟正常面试节奏，适时追问。",
                "advanced": "进行深度追问和压力测试，挑战候选人的极限。",
            }
            agent = AssistantAgent(
                name=iv.id,
                model_client=self.model_client,
                description=f"{iv.title} - {iv.style}",
                system_message=(
                    f"{iv.system_prompt}\n\n"
                    f"面试难度：{difficulty_hint.get(difficulty, '')}\n"
                    f"当你认为已经充分了解了候选人在你关注领域的表现后，"
                    f"在你的消息末尾包含 TERMINATE 表示你可以结束面试了。"
                ),
            )
            agents.append(agent)

        user_proxy = UserProxyAgent(
            name="candidate",
            description="面试候选人",
        )

        termination = TextMentionTermination("TERMINATE")

        if mode == "panel" and len(agents) > 1:
            team = SelectorGroupChat(
                participants=agents + [user_proxy],
                model_client=self.model_client,
                termination_condition=termination,
                allow_repeated_speaker=False,
            )
        else:
            team = RoundRobinGroupChat(
                participants=agents + [user_proxy],
                termination_condition=termination,
            )

        # Store team and agents for later use
        create_interview_session(interview_id, {
            "team": team,
            "agents": agents,
            "user_proxy": user_proxy,
            "message_history": [],
            "interviewers": interviewers,
            "mode": mode,
            "session_id": session_id,
        })

        # Get first message from the first interviewer agent
        first_message = InterviewMessage(
            role="interviewer",
            agent_id=interviewers[0].id,
            agent_name=f"{interviewers[0].name}（{interviewers[0].title}）",
            content=f"你好！我是{interviewers[0].title}{interviewers[0].name}，欢迎参加今天的面试。请先简单介绍一下你自己。",
        )

        return interview_id, first_message

    async def send_message(self, interview_id: str, content: str) -> dict:
        session = get_interview_session(interview_id)
        if not session:
            raise ValueError(f"Interview session {interview_id} not found")

        team = session["team"]
        user_proxy = session["user_proxy"]

        # Inject candidate message into the conversation
        candidate_msg = TextMessage(content=content, source="candidate")

        # Run the team with the candidate's message
        async for message in team.run_stream(task=candidate_msg):
            pass  # Collect messages

        # Check if conversation is complete (TERMINATE detected)
        is_complete = False
        reply_text = ""
        reply_agent_id = None

        # Get the latest agent messages from the team
        messages = await team.get_messages()
        for msg in reversed(messages):
            if hasattr(msg, "source") and msg.source != "candidate":
                reply_text = msg.content if hasattr(msg, "content") else str(msg)
                reply_agent_id = msg.source
                break

        if "TERMINATE" in reply_text:
            is_complete = True
            reply_text = reply_text.replace("TERMINATE", "").strip()

        if not reply_text:
            reply_text = "好的，感谢你的回答。"

        session["message_history"].append({"role": "candidate", "content": content})
        session["message_history"].append({"role": "interviewer", "agent_id": reply_agent_id, "content": reply_text})

        interviewer = next((i for i in session["interviewers"] if i.id == reply_agent_id), session["interviewers"][0])

        reply = InterviewMessage(
            role="interviewer",
            agent_id=reply_agent_id,
            agent_name=f"{interviewer.name}（{interviewer.title}）" if interviewer else None,
            content=reply_text,
        )

        return {
            "reply": reply,
            "is_complete": is_complete,
            "next_speaker_id": reply_agent_id,
        }

    async def end_interview(self, interview_id: str) -> list[dict]:
        session = get_interview_session(interview_id)
        if not session:
            return []
        history = session.get("message_history", [])
        delete_interview_session(interview_id)
        return history


interview_chat = InterviewChatManager()
```

---

### Task 6: 创建点拨 & 评估服务

**Files:**
- Create: `backend/app/services/interview_coach.py`
- Create: `backend/app/services/interview_eval.py`

- [ ] **Step 1: 创建 `services/interview_coach.py`**

```python
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
```

- [ ] **Step 2: 创建 `services/interview_eval.py`**

```python
import json
from app.services.llm import llm
from app.models.schemas import EvaluationReport
from app.prompts.interview import EVAL_SYSTEM, EVAL_USER


async def generate_evaluation(
    conversation: list[dict], resume_text: str, jd_text: str
) -> EvaluationReport:
    conv_text = "\n".join(
        f"{'面试官' if m['role'] == 'interviewer' else '候选人'}: {m['content']}"
        for m in conversation
    )
    user_msg = EVAL_USER.format(
        conversation=conv_text, resume_text=resume_text, jd_text=jd_text
    )
    response = await llm.chat_json(EVAL_SYSTEM, user_msg, temperature=0.3)
    data = json.loads(response)
    return EvaluationReport(**data)
```

---

### Task 7: 重写面试 API Router

**Files:**
- Rewrite: `backend/app/routers/interview.py`

- [ ] **Step 1: 替换 `routers/interview.py`**

```python
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    InterviewSetupRequest, InterviewSetupResponse,
    InterviewStartRequest, InterviewStartResponse,
    InterviewMessageRequest, InterviewMessageResponse,
    InterviewEndResponse,
)
from app.utils.session import get_session, get_interview_session
from app.services.interview_setup import generate_interviewers
from app.services.interview_chat import interview_chat
from app.services.interview_coach import generate_coaching_tip
from app.services.interview_eval import generate_evaluation

router = APIRouter()


@router.post("/setup", response_model=InterviewSetupResponse)
async def setup_interview(req: InterviewSetupRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    interviewers = await generate_interviewers(session.resume_text, req.jd_text)
    return InterviewSetupResponse(interviewers=interviewers)


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(req: InterviewStartRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    interview_id, first_message = await interview_chat.start_interview(
        req.session_id, req.interviewers, req.mode, req.difficulty
    )
    return InterviewStartResponse(interview_id=interview_id, first_message=first_message)


@router.post("/message", response_model=InterviewMessageResponse)
async def send_message(req: InterviewMessageRequest):
    try:
        result = await interview_chat.send_message(req.interview_id, req.content)
    except ValueError as e:
        raise HTTPException(404, str(e))

    # Generate coaching tip
    coaching_tip = None
    if not result["is_complete"]:
        try:
            coaching_tip = await generate_coaching_tip(
                "面试官", "", req.content
            )
        except Exception:
            pass

    return InterviewMessageResponse(
        reply=result["reply"],
        coaching_tip=coaching_tip,
        is_complete=result["is_complete"],
        next_speaker_id=result.get("next_speaker_id"),
    )


@router.post("/end", response_model=InterviewEndResponse)
async def end_interview(req: InterviewMessageRequest):
    session_data = get_interview_session(req.interview_id)
    if not session_data:
        raise HTTPException(404, "Interview session not found.")

    conversation = await interview_chat.end_interview(req.interview_id)

    session = get_session(session_data.get("session_id", ""))
    resume_text = session.resume_text if session else ""
    jd_text = session.jd_text if session else ""

    report = await generate_evaluation(conversation, resume_text, jd_text)
    return InterviewEndResponse(interview_id=req.interview_id, report=report)
```

---

### Task 8: 更新前端 API client

**Files:**
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: 在 `client.ts` 末尾追加面试 Agent API**

```typescript
// ---- Interview Agent Types ----

export interface InterviewerAgent {
  id: string;
  name: string;
  title: string;
  style: string;
  focus_areas: string[];
  system_prompt: string;
  avatar: string;
}

export interface InterviewMessage {
  role: string;
  agent_id?: string;
  agent_name?: string;
  content: string;
  coaching_tip?: string;
}

export interface InterviewSetupResponse {
  interviewers: InterviewerAgent[];
}

export interface InterviewStartResponse {
  interview_id: string;
  first_message: InterviewMessage;
}

export interface InterviewMessageResponse {
  reply: InterviewMessage;
  coaching_tip?: string;
  is_complete: boolean;
  next_speaker_id?: string;
}

export interface EvalDimension {
  name: string;
  score: number;
  feedback: string;
}

export interface RoundReview {
  question_index: number;
  question: string;
  answer_summary: string;
  rating: string;
  feedback: string;
}

export interface EvaluationReport {
  overall_score: number;
  dimensions: EvalDimension[];
  strengths: string[];
  improvements: string[];
  round_reviews: RoundReview[];
  summary: string;
}

export interface InterviewEndResponse {
  interview_id: string;
  report: EvaluationReport;
}

// ---- Interview Agent API Calls ----

export async function setupInterview(
  session_id: string, jd_text: string, mode: string, difficulty: string
): Promise<InterviewSetupResponse> {
  const { data } = await api.post('/interview/setup', { session_id, jd_text, mode, difficulty });
  return data;
}

export async function startInterview(
  session_id: string, interviewers: InterviewerAgent[], mode: string, difficulty: string
): Promise<InterviewStartResponse> {
  const { data } = await api.post('/interview/start', { session_id, interviewers, mode, difficulty });
  return data;
}

export async function sendInterviewMessage(
  interview_id: string, content: string
): Promise<InterviewMessageResponse> {
  const { data } = await api.post('/interview/message', { interview_id, content });
  return data;
}

export async function endInterview(
  interview_id: string
): Promise<InterviewEndResponse> {
  const { data } = await api.post('/interview/end', { interview_id });
  return data;
}
```

---

### Task 9: 创建面试设置页（入口 + 角色管理）

**Files:**
- Rewrite: `frontend/src/pages/InterviewPage.tsx`
- Create: `frontend/src/components/interview/InterviewSetup.tsx`
- Create: `frontend/src/components/interview/RoleManager.tsx`

- [ ] **Step 1: 创建 `InterviewSetup.tsx`**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface InterviewSetupProps {
  jdText: string;
  onStart: (mode: string, difficulty: string) => void;
  loading: boolean;
  interviewers?: Array<{ id: string; name: string; title: string; style: string; focus_areas: string[]; avatar: string }>;
  onUpdateInterviewers?: (interviewers: any[]) => void;
}

export default function InterviewSetup({ jdText, onStart, loading, interviewers, onUpdateInterviewers }: InterviewSetupProps) {
  const [mode, setMode] = useState<'1v1' | 'panel'>('1v1');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>面试设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">面试模式</label>
            <div className="flex gap-3">
              <Button variant={mode === '1v1' ? 'default' : 'outline'} onClick={() => setMode('1v1')}>
                1v1 单独面试
              </Button>
              <Button variant={mode === 'panel' ? 'default' : 'outline'} onClick={() => setMode('panel')}>
                多角色群面
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">面试难度</label>
            <div className="flex gap-3">
              {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                <Button
                  key={d}
                  variant={difficulty === d ? 'default' : 'outline'}
                  onClick={() => setDifficulty(d)}
                  size="sm"
                >
                  {d === 'beginner' ? '初级友好' : d === 'intermediate' ? '中级标准' : '高级压力'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {interviewers && interviewers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>面试官团队</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {interviewers.map((iv) => (
                <div key={iv.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="text-2xl">{iv.avatar || '👤'}</div>
                  <div className="flex-1">
                    <div className="font-medium">{iv.name} — {iv.title}</div>
                    <div className="text-sm text-muted-foreground">{iv.style}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {iv.focus_areas.map((f) => (
                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button size="lg" onClick={() => onStart(mode, difficulty)} disabled={loading || !jdText}>
          {loading ? '生成面试官中...' : '开始面试'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 重写 `InterviewPage.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { setupInterview, startInterview } from '@/api/client';
import type { InterviewerAgent } from '@/api/client';
import InterviewSetup from '@/components/interview/InterviewSetup';

export default function InterviewPage() {
  const { sessionId, jdText, setInterviewQuestions } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [interviewers, setInterviewers] = useState<InterviewerAgent[] | null>(null);
  const navigate = useNavigate();

  if (!sessionId) { navigate('/'); return null; }
  if (!jdText) { navigate('/jd-match'); return null; }

  const handleSetup = async (mode: string, difficulty: string) => {
    setLoading(true);
    try {
      const res = await setupInterview(sessionId, jdText, mode, difficulty);
      setInterviewers(res.interviewers);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (mode: string, difficulty: string) => {
    if (!interviewers) {
      // First click: generate interviewers
      await handleSetup(mode, difficulty);
      return;
    }
    // Second click: start the interview
    setLoading(true);
    try {
      const res = await startInterview(sessionId, interviewers, mode, difficulty);
      setInterviewQuestions(null); // clear old static questions
      navigate('/interview/chat', {
        state: {
          interviewId: res.interview_id,
          firstMessage: res.first_message,
          interviewers,
          mode,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <InterviewSetup
        jdText={jdText}
        onStart={handleStart}
        loading={loading}
        interviewers={interviewers || undefined}
      />
    </div>
  );
}
```

---

### Task 10: 创建对话聊天页

**Files:**
- Create: `frontend/src/pages/InterviewChatPage.tsx`
- Create: `frontend/src/components/interview/ChatBubble.tsx`
- Create: `frontend/src/components/interview/CoachingTip.tsx`

- [ ] **Step 1: 创建 `ChatBubble.tsx`**

```tsx
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  role: 'interviewer' | 'candidate' | 'system';
  agentName?: string;
  content: string;
}

export default function ChatBubble({ role, agentName, content }: ChatBubbleProps) {
  const isInterviewer = role === 'interviewer';

  return (
    <div className={cn('flex gap-3', isInterviewer ? '' : 'flex-row-reverse')}>
      <div className={cn(
        'rounded-full w-8 h-8 flex items-center justify-center text-sm shrink-0',
        isInterviewer ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
      )}>
        {isInterviewer ? agentName?.charAt(0) || '面' : '我'}
      </div>
      <div className="max-w-[75%]">
        {agentName && <div className="text-xs text-muted-foreground mb-1">{agentName}</div>}
        <div className={cn(
          'rounded-xl px-4 py-2.5 text-sm',
          isInterviewer ? 'bg-muted rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm',
        )}>
          {content}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 `CoachingTip.tsx`**

```tsx
import { Lightbulb } from 'lucide-react';

interface CoachingTipProps {
  tip: string;
}

export default function CoachingTip({ tip }: CoachingTipProps) {
  return (
    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{tip}</span>
    </div>
  );
}
```

- [ ] **Step 3: 创建 `InterviewChatPage.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { sendInterviewMessage, endInterview } from '@/api/client';
import type { InterviewMessage, InterviewerAgent, EvaluationReport } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ChatBubble from '@/components/interview/ChatBubble';
import CoachingTip from '@/components/interview/CoachingTip';

export default function InterviewChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useAppStore();

  const state = location.state as {
    interviewId: string;
    firstMessage: InterviewMessage;
    interviewers: InterviewerAgent[];
  } | null;

  const [messages, setMessages] = useState<InterviewMessage[]>(
    state?.firstMessage ? [state.firstMessage] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) navigate('/interview');
    if (!sessionId) navigate('/');
  }, [state, sessionId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !state) return;
    const content = input.trim();
    setInput('');
    setCoachingTip(null);

    const userMsg: InterviewMessage = { role: 'candidate', content };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await sendInterviewMessage(state.interviewId, content);
      setMessages((prev) => [...prev, res.reply]);
      if (res.coaching_tip) setCoachingTip(res.coaching_tip);
      if (res.is_complete) setIsComplete(true);
    } finally {
      setSending(false);
    }
  };

  const handleEnd = async () => {
    if (!state) return;
    try {
      const res = await endInterview(state.interviewId);
      navigate('/interview/report', { state: { report: res.report, interviewers: state.interviewers } });
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {state?.interviewers.map((i) => i.name).join('、')} — 面试进行中
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role as 'interviewer' | 'candidate'}
              agentName={msg.agent_name}
              content={msg.content}
            />
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {coachingTip && <CoachingTip tip={coachingTip} />}

      {isComplete ? (
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">面试已结束</p>
          <Button onClick={handleEnd} size="lg">查看评估报告</Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的回答...（Enter 发送，Shift+Enter 换行）"
            className="flex-1 resize-none"
            rows={2}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} className="self-end">
            {sending ? '...' : '发送'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### Task 11: 创建评估报告页

**Files:**
- Create: `frontend/src/pages/InterviewReportPage.tsx`
- Create: `frontend/src/components/interview/ReportChart.tsx`

- [ ] **Step 1: 创建 `ReportChart.tsx`**

```tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { EvalDimension } from '@/api/client';

interface ReportChartProps {
  dimensions: EvalDimension[];
}

export default function ReportChart({ dimensions }: ReportChartProps) {
  const data = dimensions.map((d) => ({ name: d.name, score: d.score }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar dataKey="score" stroke="oklch(0.488 0.243 264.376)" fill="oklch(0.488 0.243 264.376)" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: 创建 `InterviewReportPage.tsx`**

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import type { EvaluationReport, InterviewerAgent } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import ReportChart from '@/components/interview/ReportChart';

export default function InterviewReportPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { report: EvaluationReport; interviewers: InterviewerAgent[] } | null;

  if (!state) {
    navigate('/interview');
    return null;
  }

  const { report } = state;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>面试评估报告</CardTitle>
            <div className="text-3xl font-bold text-primary">{report.overall_score}<span className="text-lg text-muted-foreground">/100</span></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ReportChart dimensions={report.dimensions} />

          <div className="space-y-3">
            {report.dimensions.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-24 shrink-0">{d.name}</span>
                <Progress value={d.score} className="flex-1" />
                <span className="text-sm font-medium w-8">{d.score}</span>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 text-base">优势</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {report.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 text-base">改进建议</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
              {report.improvements.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {report.round_reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>逐轮回顾</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.round_reviews.map((r, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Q{r.question_index}: {r.question}</p>
                  <Badge variant={r.rating === '优秀' ? 'default' : r.rating === '良好' ? 'secondary' : 'outline'}>{r.rating}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-center space-x-4">
        <Button onClick={() => navigate('/interview')} variant="outline" size="lg">
          重新面试
        </Button>
        <Button onClick={() => navigate('/cover-letter')} size="lg">
          下一步：生成求职信
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 12: 更新路由 & App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 添加面试子路由**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@/components/layout/Header';
import HomePage from '@/pages/HomePage';
import ResumePage from '@/pages/ResumePage';
import JDMatchPage from '@/pages/JDMatchPage';
import InterviewPage from '@/pages/InterviewPage';
import InterviewChatPage from '@/pages/InterviewChatPage';
import InterviewReportPage from '@/pages/InterviewReportPage';
import CoverLetterPage from '@/pages/CoverLetterPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/score" element={<ResumePage />} />
            <Route path="/jd-match" element={<JDMatchPage />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/interview/chat" element={<InterviewChatPage />} />
            <Route path="/interview/report" element={<InterviewReportPage />} />
            <Route path="/cover-letter" element={<CoverLetterPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

---

### Task 13: 验证 & 测试

- [ ] **Step 1: 后端语法检查**

```bash
cd D:/agents/HireMeAI/backend && python -c "from app.routers.interview import router; print('Router OK')"
```

- [ ] **Step 2: 前端类型检查 & 构建**

```bash
cd D:/agents/HireMeAI/frontend && npx tsc --noEmit 2>&1
cd D:/agents/HireMeAI/frontend && npm run build 2>&1
```

- [ ] **Step 3: 重启开发服务器**

重启后端和前端，通过浏览器手动测试面试流程：
1. 上传简历 → 填写 JD → 进入面试
2. 选择 1v1 模式，点击"开始面试"
3. 在聊天界面与 AI 面试官对话
4. 面试结束后查看评估报告
