from fastapi import APIRouter, HTTPException
from app.models.schemas import JDMatchRequest, MatchResult, JDOptimizeResult
from app.utils.session import get_session, update_session
from app.services.jd_analyzer import analyze_jd_match, optimize_for_jd

router = APIRouter()


@router.post("/match", response_model=MatchResult)
async def match_jd(req: JDMatchRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    update_session(session.id, jd_text=req.jd_text)
    result = await analyze_jd_match(session.resume_text, req.jd_text)
    update_session(session.id, jd_match_result=result.model_dump())
    return result


@router.post("/optimize", response_model=JDOptimizeResult)
async def optimize_for_jd_endpoint(req: JDMatchRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(404, "Session not found or no resume uploaded.")
    update_session(session.id, jd_text=req.jd_text)
    result = await optimize_for_jd(session.resume_text, req.jd_text)
    update_session(
        session.id,
        jd_optimized_text=result.optimized_text,
        jd_optimize_result=result.model_dump(),
    )
    return result
