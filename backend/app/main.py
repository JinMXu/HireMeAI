from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import resume, jd_match, interview, cover_letter
from app.services.llm import LLMJSONError
from app.utils.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="HireMe.AI (职得)",
    description="AI-powered resume optimization tool",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(jd_match.router, prefix="/api/jd", tags=["jd"])
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(cover_letter.router, prefix="/api/cover-letter", tags=["cover-letter"])


@app.exception_handler(LLMJSONError)
async def llm_json_error_handler(_, exc: LLMJSONError):
    return JSONResponse(
        status_code=502,
        content={
            "detail": "AI 返回格式异常，请重试。",
            "error": str(exc),
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
