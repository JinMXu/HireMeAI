from app.utils import db
from app.utils import session as runtime_session


def test_active_interview_without_runtime_is_returned_as_recoverable(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "hireme.db")
    runtime_session._interview_runtime.clear()
    db.init_db()

    interview_id = "interview-1"
    runtime_session.create_interview_session(
        interview_id,
        {
            "session_id": "user-1",
            "mode": "1v1",
            "difficulty": "intermediate",
            "interviewers": [],
            "message_history": [],
        },
    )
    db.save_interview_message(
        interview_id,
        {"role": "interviewer", "agent_name": "Interviewer", "content": "Hello"},
    )

    runtime_session.delete_interview_session(interview_id)
    recovered = runtime_session.get_interview_session(interview_id)

    assert recovered is not None
    assert recovered["_runtime_missing"] is True
    assert recovered["_is_historical"] is False
    assert recovered["status"] == "active"
    assert recovered["message_history"] == [
        {
            "role": "interviewer",
            "agent_id": None,
            "agent_name": "Interviewer",
            "content": "Hello",
        }
    ]
