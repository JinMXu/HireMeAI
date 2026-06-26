import uuid
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.utils.db import (
    upsert_user_session, get_user_session as db_get_user_session, delete_user_session,
    create_interview_session as db_create_interview_session,
    get_interview_session_db, list_interviews_by_user,
)

# Session IDs are 16 lowercase hex chars (uuid4().hex[:16]). Exposed for format
# validation on endpoints that only carry the session_id as their identifier.
SESSION_ID_PATTERN = re.compile(r"^[a-f0-9]{16}$")


@dataclass
class SessionData:
    """User session — content persisted to SQLite, this is the runtime view."""
    id: str
    created_at: datetime

    @property
    def resume_text(self) -> str:
        row = db_get_user_session(self.id)
        return row.get("resume_text", "") if row else ""

    @property
    def resume_filename(self) -> str:
        row = db_get_user_session(self.id)
        return row.get("resume_filename", "") if row else ""

    @property
    def jd_text(self) -> str:
        row = db_get_user_session(self.id)
        return row.get("jd_text", "") if row else ""

    @property
    def scores(self) -> Optional[dict]:
        row = db_get_user_session(self.id)
        if row and row.get("scores"):
            import json
            return json.loads(row["scores"])
        return None

    @property
    def optimized_resume(self) -> Optional[str]:
        row = db_get_user_session(self.id)
        return row.get("optimized_resume") if row else None

    def get_extra(self) -> dict:
        row = db_get_user_session(self.id)
        if row:
            import json
            # Reconstruct extra data from individual columns
            extra = {}
            if row.get("jd_match_result") and row["jd_match_result"] != "{}":
                extra["jd_match_result"] = json.loads(row["jd_match_result"])
            if row.get("resume_optimize_result") and row["resume_optimize_result"] != "":
                extra["resume_optimize_result"] = json.loads(row["resume_optimize_result"])
            if row.get("jd_optimized_text"):
                extra["jd_optimized_text"] = row["jd_optimized_text"]
            if row.get("jd_optimize_result") and row["jd_optimize_result"] != "":
                import json as _json
                extra["jd_optimize_result"] = _json.loads(row["jd_optimize_result"])
            if row.get("cover_letter"):
                extra["cover_letter"] = row["cover_letter"]
            if row.get("recruit_greeting"):
                extra["recruit_greeting"] = row["recruit_greeting"]
            return extra
        return {}

    def set_extra(self, key: str, value):
        row = db_get_user_session(self.id)
        if row:
            if key in ("jd_match_result",):
                import json
                upsert_user_session(self.id, **{key: json.dumps(value)})
            else:
                upsert_user_session(self.id, **{key: value})


def create_session() -> SessionData:
    session_id = uuid.uuid4().hex[:16]
    # Create empty row in DB
    upsert_user_session(session_id)
    return SessionData(id=session_id, created_at=datetime.now())


def get_session(session_id: str) -> Optional[SessionData]:
    row = db_get_user_session(session_id)
    if row is None:
        return None
    return SessionData(id=session_id, created_at=datetime.fromisoformat(row["created_at"]))


def update_session(session_id: str, **fields):
    """Persist fields to SQLite. JSON-encode dict fields automatically."""
    import json
    clean = {}
    for k, v in fields.items():
        if isinstance(v, (dict, list)):
            clean[k] = json.dumps(v)
        else:
            clean[k] = v
    upsert_user_session(session_id, **clean)


# ── interview sessions (runtime: team/agents/flag only) ───────────

_interview_runtime: dict[str, dict] = {}


def create_interview_session(interview_id: str, data: dict) -> None:
    """Persist metadata to SQLite, keep runtime objects in memory."""
    db_create_interview_session(interview_id, data)
    _interview_runtime[interview_id] = {
        "team": data.get("team"),
        "agent": data.get("agent"),
        "agents": data.get("agents"),
        "is_processing": False,
        "message_history": data.get("message_history", []),
        "interviewers": data.get("interviewers", []),
        "mode": data.get("mode", "1v1"),
        "difficulty": data.get("difficulty", "intermediate"),
        "session_id": data.get("session_id", ""),
    }


def get_interview_session(interview_id: str) -> Optional[dict]:
    """Return runtime dict for active interviews, None for completed/missing."""
    runtime = _interview_runtime.get(interview_id)
    if runtime:
        return runtime

    # Try to load from DB when runtime objects are no longer in memory.
    db_row = get_interview_session_db(interview_id)
    if db_row:
        from app.utils.db import get_interview_messages, get_interview_report
        messages = get_interview_messages(interview_id)
        report = get_interview_report(interview_id)
        is_completed = db_row.get("status") == "completed"
        return {
            "message_history": messages,
            "interviewers": db_row.get("interviewers", []),
            "mode": db_row.get("mode", "1v1"),
            "difficulty": db_row.get("difficulty", "intermediate"),
            "session_id": db_row.get("session_id", ""),
            "status": db_row.get("status"),
            "report": report,
            "_is_historical": is_completed,
            "_runtime_missing": not is_completed,
        }

    return None


def delete_interview_session(interview_id: str) -> None:
    _interview_runtime.pop(interview_id, None)
