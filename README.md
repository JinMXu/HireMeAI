# HireMe.AI

HireMe.AI 是一款面向中文求职场景的 AI 简历优化与模拟面试工具。它可以帮助你上传或粘贴简历，对简历进行评分与优化，结合岗位 JD 做匹配分析，生成求职信，并通过 AI 面试官进行模拟面试和复盘。

> AI 生成内容仅供参考，不构成职业、招聘、法律或合规建议。请结合自己的经历和目标岗位进行人工确认。

## 功能特性

- 简历上传与解析：支持 PDF、Word 和文本粘贴。
- 简历评分：从多个维度分析简历质量，并提供可视化结果。
- AI 简历优化：生成优化后的简历内容，并支持 Markdown/PDF 下载。
- JD 匹配分析：识别已匹配技能、缺失技能、经验差距和改进建议。
- 针对 JD 优化简历：根据目标岗位描述生成更贴合岗位的简历版本。
- 求职信生成：基于简历和 JD 生成个性化求职信。
- 模拟面试：支持 1v1 面试和多面试官 Panel 面试。
- 流式面试对话：通过 SSE 实现实时打字式回复。
- 面试历史与报告：使用 SQLite 本地保存面试记录和评估报告。

## 技术栈

后端：

- Python 3.12
- FastAPI
- SQLite
- Microsoft AutoGen AgentChat
- DeepSeek API（兼容 OpenAI SDK）

前端：

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand

## 环境要求

- Python 3.12
- Node.js 22.13 或更高版本
- npm
- DeepSeek API Key

## 快速开始

### 启动后端

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
```

编辑 `backend/.env`，填入你的 DeepSeek API Key：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

启动服务：

```bash
uvicorn app.main:app --reload --port 8000
```

健康检查：

```bash
curl http://localhost:8000/api/health
```

### 启动前端

```bash
cd frontend
npm ci
npm run dev
```

访问 http://localhost:5173。

Vite 开发服务器会将 `/api` 请求代理到 `http://localhost:8000`。

## 环境变量

后端配置文件位于 `backend/.env`。

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | 空 |
| `DEEPSEEK_BASE_URL` | 兼容 OpenAI SDK 的 API 地址 | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 模型名称 | `deepseek-v4-pro` |
| `LLM_REQUEST_TIMEOUT_SECONDS` | LLM 请求超时时间 | `60` |
| `LLM_MAX_RETRIES` | LLM 最大重试次数 | `2` |
| `LLM_RETRY_BASE_SECONDS` | LLM 重试退避基准时间 | `0.8` |
| `MAX_FILE_SIZE_MB` | 上传文件大小限制 | `10` |
| `SESSION_TTL_MINUTES` | 内存运行时会话过期时间 | `60` |
| `MODEL_HAS_VISION` | 模型能力提示：是否支持视觉 | `false` |
| `MODEL_HAS_FUNCTION_CALLING` | 模型能力提示：是否支持函数调用 | `false` |
| `MODEL_HAS_JSON_OUTPUT` | 模型能力提示：是否支持 JSON 输出 | `true` |
| `MODEL_HAS_STRUCTURED_OUTPUT` | 模型能力提示：是否支持结构化输出 | `false` |
| `MODEL_FAMILY` | 模型系列提示 | `v4` |

## 隐私与数据说明

HireMe.AI 会处理简历、岗位描述、面试对话等敏感求职数据。使用真实个人信息前，请先确认你所配置的 LLM 服务商的数据使用、存储和隐私政策。

- 简历、JD、面试内容、评分、优化、求职信等相关提示词内容会发送到你配置的 DeepSeek 兼容 API。
- SQLite 会在本地保存 session、简历文本、JD 文本、评分结果、优化结果、求职信、面试消息和面试报告。
- 默认数据库文件为 `backend/hireme.db`，已被 Git 忽略。
- 前端会在 localStorage 中保存 `session_id`，用于刷新后恢复会话。
- 请不要提交真实简历、岗位 JD、面试记录、`.env`、数据库文件或 API Key。

## 当前限制

- 本项目优先面向本地开发和个人使用，不是生产级 SaaS 模板。
- 当前没有生产级用户认证、多租户隔离或权限管理。
- SQLite 适合本地单机使用，不适合直接承载多人生产环境。
- 后端 CORS 默认只允许 `http://localhost:5173`，主要服务本地开发。
- 使用者需要自行提供 LLM API Key。
- AI 输出可能不完整或不准确，请人工复核后再用于真实求职材料。

## 测试与验证

后端：

```bash
cd backend
python -m pytest -q
```

前端：

```bash
cd frontend
npm run lint
npm run build
```

CI 会在推送到 `master` 或提交 PR 时运行后端测试、前端 lint 和前端 build。

## 目录结构

```text
backend/app/
  routers/     FastAPI 路由
  services/    LLM、简历、JD、面试、求职信等业务逻辑
  prompts/     提示词模板
  models/      Pydantic 数据模型
  utils/       SQLite、会话和文件处理工具

frontend/src/
  pages/       路由页面
  components/  UI、共享组件和面试组件
  api/         API client 和 SSE 辅助函数
  store/       Zustand 状态管理
  lib/         前端共享工具
```

## 参与贡献

欢迎提交 Issue 和 Pull Request。请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全问题

如果你发现安全问题，请阅读 [SECURITY.md](SECURITY.md)，并尽量通过私密渠道反馈，避免在公开 Issue 中暴露敏感信息。

## 开源协议

本项目使用 MIT License，详见 [LICENSE](LICENSE)。
