from fastapi import APIRouter, HTTPException
from app.models.schemas import CoverLetterRequest, CoverLetterResult
from app.utils.session import get_session, update_session
from app.services.cover_letter_gen import generate_cover_letter

router = APIRouter()


@router.post("/generate", response_model=CoverLetterResult)
async def generate(req: CoverLetterRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    update_session(session.id, jd_text=req.jd_text)
    return await generate_cover_letter(
        session.resume_text, req.jd_text, req.company_name, req.position_name
    )
