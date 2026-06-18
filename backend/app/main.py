from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import resume, jd_match, interview, cover_letter
from app.services.llm import LLMJSONError, LLMTransientError
from app.utils.db import init_db

logger = logging.getLogger(__name__)


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
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(resume.router, prefix="/api/resume", tags=["resume"])
app.include_router(jd_match.router, prefix="/api/jd", tags=["jd"])
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(cover_letter.router, prefix="/api/cover-letter", tags=["cover-letter"])


@app.exception_handler(LLMJSONError)
async def llm_json_error_handler(_, exc: LLMJSONError):
    logger.warning("LLM JSON error: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"detail": "AI 返回格式异常，请重试。"},
    )


@app.exception_handler(LLMTransientError)
async def llm_transient_error_handler(_, exc: LLMTransientError):
    logger.warning("LLM transient error: %s", exc)
    return JSONResponse(
        status_code=502,
        content={"detail": "AI 服务暂时不可用，请稍后重试。"},
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
