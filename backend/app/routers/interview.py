from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.models.schemas import (
    InterviewSetupRequest, InterviewSetupResponse,
    InterviewStartRequest, InterviewStartResponse,
    InterviewMessageRequest, InterviewMessageResponse,
    InterviewEndRequest, InterviewEndResponse, EvaluationReport,
)
from app.utils.session import get_session, get_interview_session, update_session
from app.utils.db import (
    list_interviews_by_user, get_interview_messages, get_interview_report,
    save_interview_report, update_interview_status, get_interview_session_db,
)
from app.services.interview_setup import generate_interviewers
from app.services.interview_chat import interview_chat
from app.services.interview_eval import generate_evaluation

router = APIRouter()


@router.post("/setup", response_model=InterviewSetupResponse)
async def setup_interview(req: InterviewSetupRequest):
    session = get_session(req.session_id)
    if not session or not session.resume_text:
        raise HTTPException(422, "Session not found or no resume uploaded.")
    interviewers = await generate_interviewers(session.resume_text, req.jd_text, req.mode)
    return InterviewSetupResponse(interviewers=interviewers)


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(req: InterviewStartRequest):
    session = get_session(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found.")
    interview_id, first_message = await interview_chat.start_interview(
        req.session_id, req.interviewers, req.mode, req.difficulty,
        resume_text=session.resume_text or "",
        jd_text=session.jd_text or "",
    )
    return InterviewStartResponse(interview_id=interview_id, first_message=first_message)


@router.post("/message")
async def send_message(req: InterviewMessageRequest):
    try:
        stream = interview_chat.send_message_stream(req.interview_id, req.content)
    except ValueError as e:
        raise HTTPException(404, str(e))
    return StreamingResponse(stream, media_type="text/event-stream")


@router.post("/end", response_model=InterviewEndResponse)
async def end_interview(req: InterviewEndRequest):
    session_data = get_interview_session(req.interview_id)
    if not session_data:
        raise HTTPException(404, "Interview session not found.")

    conversation = await interview_chat.end_interview(req.interview_id)

    resume_text = ""
    jd_text = ""
    if not session_data.get("_is_historical"):
        session = get_session(session_data.get("session_id", ""))
        resume_text = session.resume_text if session else ""
        jd_text = session.jd_text if session else ""

    report = await generate_evaluation(conversation, resume_text, jd_text)

    # Persist report to DB
    save_interview_report(req.interview_id, report.model_dump())
    update_interview_status(req.interview_id, "completed")

    return InterviewEndResponse(interview_id=req.interview_id, report=report)


@router.get("/history")
async def interview_history(session_id: str = Query(...)):
    interviews = list_interviews_by_user(session_id)
    # Attach report summary to each entry
    result = []
    for iv in interviews:
        entry = dict(iv)
        report = get_interview_report(iv["id"])
        entry["overall_score"] = report.get("overall_score") if report else None
        result.append(entry)
    return {"interviews": result}


@router.get("/{interview_id}")
async def get_interview_detail(interview_id: str):
    session_data = get_interview_session(interview_id)
    if not session_data:
        raise HTTPException(404, "Interview not found.")

    if session_data.get("_is_historical"):
        return {
            "interview_id": interview_id,
            "messages": session_data.get("message_history", []),
            "report": session_data.get("report"),
            "mode": session_data.get("mode"),
            "difficulty": session_data.get("difficulty"),
        }

    # Active session — fetch from DB
    db_row = get_interview_session_db(interview_id)
    messages = get_interview_messages(interview_id)
    report = get_interview_report(interview_id)

    return {
        "interview_id": interview_id,
        "messages": messages,
        "report": report,
        "mode": db_row.get("mode") if db_row else None,
        "difficulty": db_row.get("difficulty") if db_row else None,
    }
