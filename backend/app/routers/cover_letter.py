from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    CoverLetterRequest, CoverLetterResult,
    RecruitGreetingRequest, RecruitGreetingResult,
)
from app.utils.session import get_session, update_session
from app.services.cover_letter_gen import generate_cover_letter, generate_recruit_greeting

router = APIRouter()


@router.post("/generate", response_model=CoverLetterResult)
async def generate(req: CoverLetterRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    update_session(session.id, jd_text=req.jd_text)
    result = await generate_cover_letter(
        session.resume_text, req.jd_text, req.company_name, req.position_name
    )
    update_session(session.id, cover_letter=result.cover_letter)
    return result


@router.post("/greeting", response_model=RecruitGreetingResult)
async def generate_greeting(req: RecruitGreetingRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    update_session(session.id, jd_text=req.jd_text)
    result = await generate_recruit_greeting(
        session.resume_text, req.jd_text, req.company_name, req.position_name
    )
    update_session(session.id, recruit_greeting=result.greeting)
    return result
