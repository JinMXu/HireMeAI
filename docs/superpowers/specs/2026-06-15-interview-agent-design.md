# 面试 Agent 对话系统 — 设计文档

> **目标：** 将当前"一次性生成面试题"模式替换为 AI Agent 驱动的对话式模拟面试系统。
> **日期：** 2026-06-15
> **状态：** 已确认

---

## 1. 概述

### 1.1 当前状态

面试模块目前是简单的"问题生成器"：后端一次性生成 13 道面试题（行为面 5 题 + 技术面 5 题 + 弱点探测 3 题），附带回答策略，前端按类别静态展示。

### 1.2 目标

将其改造为**交互式 Agent 对话系统**，模拟真实面试场景。AI 根据候选人的简历和 JD 扮演面试官角色，进行实时对话、追问、评估，提供沉浸式面试体验。

### 1.3 核心原则

- **真实性优先** — 模拟真实面试的节奏、压力和互动
- **JD 驱动** — 根据目标职位动态生成匹配的面试官团队
- **全行业适用** — 不限于技术岗，通过 JD 分析自动适配角色
- **可重复练习** — 每次对话不同，可保存历史记录反复回顾

---

## 2. 功能设计

### 2.1 面试模式

| 模式 | 描述 |
|------|------|
| **1v1 单独面试** | 单个 AI 面试官与候选人一对一对话 |
| **多角色群面** | 多个 AI 面试官轮流提问，模拟真实面试场景 |

用户可在面试前选择模式，群面中每个面试官有独立的提问风格和专注领域。

### 2.2 面试官角色生成

**策略：JD 驱动动态生成 + 用户可调整**

1. 系统分析 JD 文本，提取关键能力域（如"React"→前端技术，"团队管理"→领导力）
2. 为每项关键能力域自动生成一名面试官，配备独立的：
   - 角色名称和头衔（如"前端技术面试官 · 张工"）
   - 提问风格（技术深度、行为面、情景假设等）
   - 专注领域
3. 通用角色始终存在：HR 面试官、压力面试官
4. 用户可增加、删除、编辑任何角色

**角色结构：**
```
InterviewerAgent {
  id: string
  name: string           // "张工"
  title: string          // "前端技术面试官"
  style: string          // "技术深度型"
  focus_areas: string[]  // ["React", "TypeScript", "系统设计"]
  personality: string    // 系统提示词中的人格描述
  avatar: string         // emoji 或图标
}
```

### 2.3 对话流程

- **完全开放式聊天** — 无预设问题清单，AI 根据回答上下文实时追问、深挖
- **面试结束判断** — 由 AI 面试官自主决定，基于对候选人表现的评估（已充分了解、所有关键领域已覆盖等）
- **对话消息结构：**
```
Message {
  role: "interviewer" | "candidate" | "system"
  agent_id?: string      // 群面时标识哪个面试官
  content: string
  coaching_tip?: string  // 实时点拨（仅 candidate 可见）
  timestamp: datetime
}
```

### 2.4 实时点拨

面试过程中，系统在候选人每次回答后提供简要点拨（仅候选人可见）：

- 回答的亮点
- 可以补充的数据或案例
- 表达方式的改进建议
- 下一题的预期方向

点拨以低调的方式呈现（如对话中的折叠提示条），不打断面试流程。

### 2.5 面试评估报告

面试结束后自动生成：

- **总体评分** (0-100)
- **维度评分**：沟通表达、专业深度、逻辑思维、临场反应、文化适配等
- **逐轮点评**：每道关键问题的回答评估
- **改进建议**：按优先级排序的改进方向
- **亮点总结**：回答中的出色之处

### 2.6 用户流程

```
上传简历 + JD → 面试设置（模式/难度） → AI 生成面试官团队 → 用户审查/调整角色 
→ 开始面试（对话+点拨） → 面试官结束面试 → 生成评估报告 → 可重试或进入下一步
```

---

## 3. 技术架构

### 3.0 框架选型：Microsoft AutoGen

选择 **AutoGen** (ag2 最新版本) 作为 Agent 编排框架：

- **GroupChat** — 原生群聊管理器，自动发言轮转，完美匹配群面
- **ConversableAgent** — 可定制的对话角色，每个面试官一个实例
- **RoundRobinGroupChat / SelectorGroupChat** — 内置发言选择策略
- **Agent Runtime** — 对话状态自动管理、消息持久化
- **多 Provider 支持** — 兼容 DeepSeek (OpenAI-compatible API)
- **Human-in-the-loop** — 候选人的消息自然作为 human input

**依赖：** `autogen-agentchat` + `autogen-ext[openai]`

### 3.1 整体架构

```
Frontend (React + shadcn/ui)
  ├── InterviewSetupPage     — 模式选择、难度设定、角色管理
  ├── InterviewChatPage       — 聊天界面（消息列表 + 输入框 + 点拨面板）
  └── InterviewReportPage     — 评估报告展示

Backend (FastAPI + Python + AutoGen)
  ├── POST /api/interview/setup      — 分析JD，生成面试官团队
  ├── POST /api/interview/start      — 创建 AutoGen GroupChat，返回首条消息
  ├── POST /api/interview/message    — 转发候选人消息到 GroupChat，返回追问 + 点拨
  ├── POST /api/interview/end        — 结束面试，生成评估报告
  └── GET  /api/interview/{id}       — 获取历史面试记录
```

### 3.2 后端服务（基于 AutoGen）

#### 3.2.1 JD 分析服务 (`services/interview_setup.py`)

- 输入：JD 文本 + 简历文本
- 调用 LLM 提取关键能力域
- 为每项能力生成面试官角色定义
- 输出：面试官团队列表

#### 3.2.2 面试对话服务 (`services/interview_chat.py`)

核心基于 AutoGen 的 **GroupChat** + **SelectorGroupChat**：

- 1v1 模式：单个 ConversableAgent（面试官） + 候选人 human input
- 群面模式：多个 ConversableAgent（每个面试官一个）+ GroupChat 管理器自动协调发言
- 每个 ConversableAgent 的 system_message 包含角色人格、简历上下文、JD 要求
- 候选人消息通过 human input 机制注入 GroupChat
- AutoGen 自动管理对话历史和上下文窗口

**实时点拨：**
- 每次候选人回答后，额外调用 LLM（独立于 GroupChat）生成简要点评
- 点拨内容仅返回给前端候选人侧，不注入 GroupChat 对话

#### 3.2.3 评估服务 (`services/interview_eval.py`)

- 输入：完整 GroupChat 对话历史 + 简历 + JD
- 调用 LLM 生成结构化评估报告
- 输出：评分、维度分析、逐轮点评、改进建议

### 3.3 对话状态管理

AutoGen 的 Agent Runtime 自动管理对话状态和消息持久化。应用层只需维护：

```
InterviewSession {
  session_id: string            // 关联到现有简历 session
  mode: "1v1" | "panel"
  difficulty: "beginner" | "intermediate" | "advanced"
  interviewers: InterviewerAgent[]
  group_chat_id?: string        // AutoGen GroupChat 实例引用
  status: "setup" | "active" | "completed"
  started_at: datetime
  ended_at?: datetime
}
```

- AutoGen 管理对话历史（无需手动存储 messages）
- GroupChat 自动处理发言轮转（群面模式）
- 对话结束判断：检测 AutoGen 返回的 `TERMINATE` 信号或面试官主动结束消息

### 3.4 前端组件

#### 面试设置页 (`InterviewSetupPage`)

- 模式选择：1v1 / 群面
- 难度滑块（初级/中级/高级）
- JD 分析后展示推荐角色列表，可编辑
- "开始面试"按钮

#### 对话页 (`InterviewChatPage`)

- 聊天消息流（类似微信/Teams 界面）
- 群面时每条面试官消息显示头像和名称
- 实时点拨以折叠提示条形式展示在消息旁
- 输入框 + 发送按钮
- 顶部显示面试进度/状态

#### 评估报告页 (`InterviewReportPage`)

- 总分 + 雷达图（与现有评分页一致风格）
- 各维度进度条
- 逐轮点评列表
- 改进建议卡片
- "重新面试"按钮

---

## 4. API 设计

### 4.1 POST /api/interview/setup

```
Request:  { session_id, jd_text, mode, difficulty }
Response: { interviewers: InterviewerAgent[] }
```

### 4.2 POST /api/interview/start

```
Request:  { session_id, interviewers }
Response: { interview_id, first_message: Message }
```

### 4.3 POST /api/interview/message

```
Request:  { interview_id, content }
Response: {
  reply: Message,           // AI 面试官的追问
  coaching_tip?: string,    // 实时点拨
  is_complete: bool,        // 面试是否结束
  next_speaker_id?: string  // 群面：下一位面试官ID
}
```

### 4.4 POST /api/interview/end

```
Request:  { interview_id }
Response: { report: EvaluationReport }
```

### 4.5 GET /api/interview/{id}

```
Response: { session: InterviewSession, report?: EvaluationReport }
```

---

## 5. 数据模型

### EvaluationReport

```
{
  overall_score: number,           // 0-100
  dimensions: [
    { name: "沟通表达", score: number, feedback: string },
    { name: "专业深度", score: number, feedback: string },
    ...
  ],
  round_reviews: [
    { question_index: number, question: string, answer_summary: string, rating: string, feedback: string }
  ],
  strengths: string[],
  improvements: string[],
  summary: string
}
```

---

## 6. 与现有系统的集成

- **复用现有 session 机制** — 面试 session 关联到简历 session_id
- **复用 LLM 服务** — `app/services/llm.py` 的 `chat_json` 方法
- **复用现有评估雷达图组件** — 与 ResumePage 的评分展示风格一致
- **保持导航流程** — 面试仍在 pipeline 的第四步：上传 → 评分 → JD匹配 → **面试** → 求职信

---

## 7. 确认的设计决策

| 决策项 | 选择 |
|--------|------|
| 面试模式 | 1v1 + 群面，两种模式共存 |
| 角色生成 | JD 动态生成 + 用户可调整，通用角色始终存在 |
| 对话节奏 | 完全开放式聊天，面试官自主判断结束 |
| 反馈方式 | 面试中实时点拨 + 面试后完整评估报告 |
| 适用岗位 | 全行业支持，JD 分析自动适配 |
| 可重复性 | 可反复练习，保存历史记录 |
