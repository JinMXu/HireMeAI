# HireMe.AI

HireMe.AI is an AI-assisted resume optimization and mock interview tool. It
helps users upload or paste a resume, score and improve it, compare it against
a job description, practice with AI interviewers, and review interview reports.

> AI output is for reference only. It is not professional career, hiring, legal,
> or compliance advice.

## Features

- Resume upload and parsing from PDF, Word, or pasted text.
- Resume scoring across multiple dimensions with visual feedback.
- AI resume optimization and downloadable optimized resumes in Markdown/PDF.
- JD matching with matched skills, missing skills, gaps, and suggestions.
- JD-specific resume optimization.
- Cover letter generation based on resume and JD content.
- 1v1 and panel-style mock interviews powered by Microsoft AutoGen.
- Streaming interview chat over SSE.
- Interview history and evaluation reports stored locally in SQLite.

## Tech Stack

Backend:

- Python 3.12
- FastAPI
- SQLite
- Microsoft AutoGen AgentChat
- OpenAI-compatible DeepSeek API

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand

## Requirements

- Python 3.12
- Node.js 22.13 or newer
- npm
- DeepSeek API key

## Quick Start

### Backend

```bash
cd backend
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and set your DeepSeek API key:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/api/health
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173.

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Environment Variables

Configured in `backend/.env`.

| Variable | Description | Default |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API key | empty |
| `DEEPSEEK_BASE_URL` | OpenAI-compatible API base URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | Model name | `deepseek-v4-pro` |
| `LLM_REQUEST_TIMEOUT_SECONDS` | LLM request timeout | `60` |
| `LLM_MAX_RETRIES` | LLM retry count | `2` |
| `LLM_RETRY_BASE_SECONDS` | LLM retry backoff base | `0.8` |
| `MAX_FILE_SIZE_MB` | Upload size limit | `10` |
| `SESSION_TTL_MINUTES` | Runtime session TTL | `60` |
| `MODEL_HAS_VISION` | Model capability hint | `false` |
| `MODEL_HAS_FUNCTION_CALLING` | Model capability hint | `false` |
| `MODEL_HAS_JSON_OUTPUT` | Model capability hint | `true` |
| `MODEL_HAS_STRUCTURED_OUTPUT` | Model capability hint | `false` |
| `MODEL_FAMILY` | Model family hint | `v4` |

## Privacy and Data Handling

HireMe.AI processes sensitive career data. Before using real personal data,
review your LLM provider's privacy and retention policies.

- Resume, JD, interview, scoring, optimization, and cover letter prompt content
  is sent to the configured DeepSeek-compatible API endpoint.
- SQLite stores local session data, resume text, JD text, scores, optimized
  resumes, cover letters, interview messages, and interview reports.
- The default database is `backend/hireme.db` and is ignored by Git.
- The frontend stores `session_id` in localStorage so sessions can be restored
  after refresh.
- Do not commit real resumes, job descriptions, interview transcripts, `.env`
  files, database files, or API keys.

## Project Limitations

- This is a local-first development project, not a production SaaS template.
- There is no production authentication or multi-user access control.
- SQLite is used as a single-node local database.
- Backend CORS currently allows `http://localhost:5173` for local development.
- Users must provide their own LLM API key.
- AI output can be incomplete or inaccurate and should be reviewed manually.

## Testing

Backend:

```bash
cd backend
python -m pytest -q
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

CI runs backend tests and frontend lint/build checks on pushes and pull
requests to `master`.

## Repository Structure

```text
backend/app/
  routers/     FastAPI routes
  services/    LLM, resume, JD, interview, and cover letter services
  prompts/     Prompt templates
  models/      Pydantic schemas
  utils/       SQLite, sessions, and file handling

frontend/src/
  pages/       Route pages
  components/  UI, shared, and interview components
  api/         API client and SSE helpers
  store/       Zustand app state
  lib/         Shared frontend utilities
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
