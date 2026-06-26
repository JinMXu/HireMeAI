from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import (
    ResumeUploadResponse, ResumeTextRequest, SessionRequest,
    ScoreResult, OptimizeResult,
)
from app.utils.session import create_session, get_session, update_session, SESSION_ID_PATTERN
from app.utils.db import get_user_session as db_get_user_session
from app.services.parser import parse_pdf, parse_docx, clean_text
from app.services.scorer import score_resume
from app.services.optimizer import optimize_resume
from app.config import settings

router = APIRouter()


@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx", "doc"):
        raise HTTPException(400, "Unsupported file type. Use PDF or Word.")

    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {settings.max_file_size_mb}MB.")

    if ext == "pdf":
        text = parse_pdf(content)
    else:
        text = parse_docx(content)

    if not text or len(text.strip()) < 50:
        raise HTTPException(422, "Could not extract enough text from file.")

    session = create_session()
    update_session(session.id, resume_text=text, resume_filename=file.filename)

    return ResumeUploadResponse(
        session_id=session.id,
        filename=file.filename,
        text=text,
        char_count=len(text),
    )


@router.post("/parse-text", response_model=ResumeUploadResponse)
async def parse_text_resume(req: ResumeTextRequest):
    text = clean_text(req.text)
    session = create_session()
    update_session(session.id, resume_text=text, resume_filename="pasted_text")

    return ResumeUploadResponse(
        session_id=session.id,
        filename="pasted_text",
        text=text,
        char_count=len(text),
    )


@router.post("/score", response_model=ScoreResult)
async def score(req: SessionRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    result = await score_resume(session.resume_text)
    update_session(session.id, scores=result.model_dump())
    return result


@router.post("/optimize", response_model=OptimizeResult)
async def optimize(req: SessionRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    result = await optimize_resume(session.resume_text)
    update_session(
        session.id,
        optimized_resume=result.optimized_text,
        resume_optimize_result=result.model_dump(),
    )
    return result


@router.get("/session/{session_id}")
async def get_session_data(session_id: str):
    if not SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(400, "Invalid session id format.")
    row = db_get_user_session(session_id)
    if not row:
        raise HTTPException(404, "Session not found.")
    import json
    return {
        "session_id": row["id"],
        "resume_text": row.get("resume_text", ""),
        "resume_filename": row.get("resume_filename", ""),
        "jd_text": row.get("jd_text", ""),
        "scores": json.loads(row["scores"]) if row.get("scores") and row["scores"] != "{}" else None,
        "optimized_resume": row.get("optimized_resume", ""),
        "resume_optimize_result": json.loads(row["resume_optimize_result"]) if row.get("resume_optimize_result") and row["resume_optimize_result"] != "" else None,
        "jd_match_result": json.loads(row["jd_match_result"]) if row.get("jd_match_result") and row["jd_match_result"] != "{}" else None,
        "jd_optimized_text": row.get("jd_optimized_text", ""),
        "jd_optimize_result": json.loads(row["jd_optimize_result"]) if row.get("jd_optimize_result") and row["jd_optimize_result"] != "" else None,
        "cover_letter": row.get("cover_letter", ""),
        "recruit_greeting": row.get("recruit_greeting", ""),
    }
