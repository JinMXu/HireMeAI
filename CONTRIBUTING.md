# 参与贡献

感谢你愿意改进 HireMe.AI。本项目是一个基于 FastAPI + React 的 AI 求职工具，覆盖简历优化、JD 匹配、求职信生成和模拟面试。

## 本地开发环境

建议环境：

- Python 3.12
- Node.js 22.13 或更高版本
- npm
- DeepSeek API Key（用于本地体验 AI 功能）

启动后端：

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

启动前端：

```bash
cd frontend
npm ci
npm run dev
```

访问 http://localhost:5173。

## 提交 PR 前的检查

请尽量在提交 Pull Request 前运行：

```bash
cd backend
python -m pytest -q
```

```bash
cd frontend
npm run lint
npm run build
```

## Pull Request 建议

- 保持变更聚焦，避免把多个无关改动混在一起。
- 后端行为变化请尽量补充或更新测试。
- 前端交互变化请手动验证对应流程。
- 不要提交 `.env`、SQLite 数据库、上传的简历、构建产物、API Key 或真实简历/JD 数据。
- 如果变更会影响用户体验、隐私处理或 AI 数据流，请在 PR 描述中说明。

## 提交 Issue

提交 Bug 或功能建议时，请使用 GitHub Issue 模板。复现问题时请提供清晰步骤，但不要粘贴真实简历、岗位 JD、面试记录、API Key 或其他敏感信息。
