# HireMe.AI (职得)

AI 驱动的全流程简历优化与模拟面试工具。

## 功能

### 简历 pipeline
- **简历上传** — PDF / Word / 文本粘贴，自动解析
- **6 维度评分** — 雷达图可视化：内容完整度、关键词匹配、格式规范、量化成果、语言表达、行业适配
- **AI 简历优化** — 一键优化措辞、补充量化数据
- **JD 匹配分析** — 匹配度计算 + 缺失技能识别 + 针对性优化建议
- **求职信生成** — 基于简历和 JD 自动生成个性化求职信

### AI 面试 Agent
- **1v1 单独面试** — 单个 AI 面试官一对一深度面试
- **多角色群面** — HR + 技术面试官 + 管理面试官轮流提问
- **JD 驱动角色生成** — 根据职位描述自动生成匹配的面试官团队（角色、风格、专注领域）
- **实时流式对话** — SSE 流式传输，打字机效果
- **实时点拨** — 每次回答后给出简短改进建议
- **智能结束** — 面试官自主判断面试结束，而非硬性轮次限制
- **评估报告** — 4 维度评分 + 逐轮回顾 + 优势/改进建议
- **面试历史** — SQLite 持久化存储，刷新不丢数据，可回看历史面试

## 技术架构

```
Frontend (React + TypeScript + Vite + TailwindCSS)
  ├── 7 个路由页面（Home / Resume / JD Match / Interview / Chat / Report / CoverLetter）
  ├── Zustand 状态管理 + localStorage 持久化
  └── SSE 流式消费

Backend (FastAPI + Python)
  ├── routers/     — REST API（resume, jd_match, interview, cover_letter）
  ├── services/    — 业务逻辑（LLM, AutoGen Agent, 评分, 优化, 评估）
  ├── prompts/     — LLM 提示词模板
  ├── models/      — Pydantic 数据模型
  └── utils/       — 会话管理, SQLite 持久化

AI Agent (Microsoft AutoGen)
  ├── AssistantAgent — 面试官角色实例
  ├── RoundRobinGroupChat / SelectorGroupChat — 群面调度
  └── DeepSeek API — LLM 后端
```

## 快速开始

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # 编辑 .env，填入 DeepSeek API Key
uvicorn app.main:app --reload --port 8000
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | — |
| `DEEPSEEK_BASE_URL` | API 地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名称 | `deepseek-v4-pro` |
| `MODEL_FAMILY` | 模型系列 | `v4` |
| `MAX_FILE_SIZE_MB` | 上传文件大小上限 | `10` |
| `SESSION_TTL_MINUTES` | 会话过期时间 | `60` |

## 用户流程

```
上传简历 → 评分 → JD 匹配 → 模拟面试 → 评估报告 → 求职信
                                                    ↓
                                              历史回看 / 重新面试
```

## 数据库

SQLite 单文件 `backend/hireme.db`，首次启动自动创建。存储：
- 用户 session（简历、JD、评分、优化结果）
- 面试记录（对话历史、评估报告）
