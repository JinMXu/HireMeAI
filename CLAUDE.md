# CLAUDE.md — HireMe.AI

## 项目概述

AI 驱动的全流程简历优化与模拟面试工具。后端 Python FastAPI + Microsoft AutoGen Agent 框架，前端 React + TypeScript + Vite + TailwindCSS。

## 关键架构决策

- **LLM**: DeepSeek API（兼容 OpenAI SDK），推理模型（MODEL_FAMILY=r1）会输出 `<think>` 标签，所有 LLM 响应需要 strip
- **Agent 框架**: Microsoft AutoGen (`autogen-agentchat>=0.7.0`)，`AssistantAgent` + `RoundRobinGroupChat`/`SelectorGroupChat`
- **1v1 面试**: 使用 `agent.run_stream(task=msg)` 直接调用，避免 GroupChat 自循环
- **Panel 面试**: `RoundRobinGroupChat(max_turns=1)`，每轮一位面试官发言，跨轮次轮换
- **持久化**: SQLite (`backend/hireme.db`)，只存内容数据不存 AutoGen 运行时对象
- **会话**: `session_id` 存前端 Zustand + localStorage，刷新后通过 `GET /api/resume/session/{id}` 恢复
- **流式**: SSE (`text/event-stream`)，事件类型: `status` / `chunk` / `reply` / `coaching_tip` / `error`

## 目录结构

```
backend/app/
  routers/     — resume.py, jd_match.py, interview.py, cover_letter.py
  services/    — llm.py, interview_chat.py, interview_setup.py, interview_coach.py, interview_eval.py, scorer.py, optimizer.py, jd_analyzer.py, cover_letter_gen.py
  prompts/     — interview.py, scoring.py, optimization.py, jd_match.py, cover_letter.py
  models/      — schemas.py (Pydantic models)
  utils/       — session.py (runtime + DB), db.py (SQLite CRUD), file_handler.py

frontend/src/
  pages/       — 7 路由页面
  components/  — interview/ (ChatBubble, CoachingTip, InterviewSetup, ReportChart), ui/ (shadcn)
  api/         — client.ts (Axios + fetch SSE)
  store/       — appStore.ts (Zustand + localStorage)
```

## 面试 Agent 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `max_turns` | 1 (panel) | 每轮 `run_stream` 最多 1 位 agent 发言 |
| `MaxMessageTermination` | 30 | 硬上限安全网 |
| `STREAM_CHUNK_TIMEOUT` | 30s | 流内单 chunk 超时 |
| `CONTEXT_REBUILD_THRESHOLD` | 18 条消息 | 超过后压缩旧消息摘要 |

## 避免的坑

- **`InterviewerAgent` 是 Pydantic 模型，存 SQLite 前需 `.model_dump()`**
- **`max_turns` 的 `stop_reason` 含 `"max"` 子串，需排除 `"turn"` 才判为硬上限**
- **`RoundRobinGroupChat` 1 agent = 自循环，1v1 必须用 `agent.run_stream()`**
- **DeepSeek-R1 的 `<think>` 标签在 `llm.py` 全局 strip，流式在 `interview_chat.py` 实时strip**
- **`session["is_processing"]` 防止并发发送，前端 `sending` 状态锁双重保护**
- **Panel 模式每轮 `max_turns=1`，面试官跨轮 RoundRobin 轮换**
