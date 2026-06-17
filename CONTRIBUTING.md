# Contributing to HireMe.AI

Thanks for your interest in improving HireMe.AI. This project is a FastAPI +
React application for resume optimization, JD matching, and mock interview
practice.

## Development Setup

Requirements:

- Python 3.12
- Node.js 22.13 or newer
- npm
- A DeepSeek API key for local AI features

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173.

## Checks Before Pull Requests

Run these commands before opening a PR:

```bash
cd backend
python -m pytest -q
```

```bash
cd frontend
npm run lint
npm run build
```

## Pull Request Guidelines

- Keep changes focused and easy to review.
- Include tests for backend behavior changes.
- For frontend changes, verify the relevant workflow manually.
- Do not commit `.env`, SQLite databases, uploaded resumes, generated build
  output, API keys, or personal resume/JD data.
- Explain user-facing behavior changes in the PR description.

## Reporting Issues

Use the GitHub issue templates for bugs and feature requests. Include clear
steps to reproduce bugs and avoid sharing private resume, JD, or interview
content.
