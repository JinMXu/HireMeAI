import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import EvaluationReport
from app.routers import interview as interview_router
from app.utils import db
from app.utils import session as runtime_session


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "hireme.db")
    runtime_session._interview_runtime.clear()
    with TestClient(app) as test_client:
        yield test_client
    runtime_session._interview_runtime.clear()


def _create_user_session(session_id: str = "user-1"):
    db.upsert_user_session(
        session_id,
        resume_text="Python backend engineer with interview-ready project experience.",
        jd_text="Backend engineer role focused on FastAPI and AI workflows.",
    )


def _create_interview(interview_id: str, session_id: str = "user-1"):
    runtime_session.create_interview_session(
        interview_id,
        {
            "session_id": session_id,
            "mode": "1v1",
            "difficulty": "intermediate",
            "interviewers": [
                {
                    "id": "tech",
                    "name": "Wang",
                    "title": "Tech Lead",
                    "style": "direct",
                    "focus_areas": ["backend"],
                    "system_prompt": "Ask backend questions.",
                    "avatar": "",
                }
            ],
            "message_history": [],
        },
    )
    db.save_interview_message(
        interview_id,
        {"role": "interviewer", "agent_name": "Wang", "content": "Please introduce yourself."},
    )


def _sample_report() -> dict:
    return {
        "overall_score": 82,
        "dimensions": [{"name": "Technical", "score": 80, "feedback": "Solid"}],
        "strengths": ["Clear examples"],
        "improvements": ["Add metrics"],
        "round_reviews": [],
        "summary": "Good interview.",
    }


def test_history_and_detail_include_action_metadata(client):
    _create_user_session()
    _create_interview("active-1")

    history = client.get("/api/interview/history", params={"session_id": "user-1"}).json()
    item = history["interviews"][0]

    assert item["has_report"] is False
    assert item["message_count"] == 1
    assert item["runtime_missing"] is False
    assert item["can_continue"] is True
    assert item["can_end"] is False
    assert item["action"] == "continue"

    detail = client.get("/api/interview/active-1", params={"session_id": "user-1"}).json()
    assert detail["status"] == "active"
    assert detail["runtime_missing"] is False
    assert detail["can_continue"] is True
    assert detail["can_end"] is False
    assert detail["interviewers"][0]["id"] == "tech"


def test_runtime_missing_active_interview_can_generate_report(client, monkeypatch):
    _create_user_session()
    _create_interview("lost-1")
    db.save_interview_message("lost-1", {"role": "candidate", "content": "I built APIs."})
    runtime_session.delete_interview_session("lost-1")

    async def fake_generate_evaluation(conversation, resume_text, jd_text):
        assert len(conversation) == 2
        assert "Python backend engineer" in resume_text
        assert "FastAPI" in jd_text
        return EvaluationReport(**_sample_report())

    monkeypatch.setattr(interview_router, "generate_evaluation", fake_generate_evaluation)

    history = client.get("/api/interview/history", params={"session_id": "user-1"}).json()
    item = history["interviews"][0]
    assert item["runtime_missing"] is True
    assert item["can_continue"] is False
    assert item["can_end"] is True
    assert item["action"] == "generate_report"

    ended = client.post("/api/interview/end", json={"interview_id": "lost-1", "session_id": "user-1"})
    assert ended.status_code == 200
    assert ended.json()["report"]["overall_score"] == 82


def test_end_interview_returns_existing_report_without_regeneration(client, monkeypatch):
    _create_user_session()
    _create_interview("reported-1")
    db.save_interview_message("reported-1", {"role": "candidate", "content": "I built APIs."})
    db.save_interview_report("reported-1", _sample_report())

    async def fail_generate_evaluation(*_):
        raise AssertionError("existing report should be returned directly")

    monkeypatch.setattr(interview_router, "generate_evaluation", fail_generate_evaluation)

    response = client.post("/api/interview/end", json={"interview_id": "reported-1", "session_id": "user-1"})
    assert response.status_code == 200
    assert response.json()["report"]["overall_score"] == 82


def test_end_interview_rejects_conversation_without_candidate_answer(client):
    _create_user_session()
    _create_interview("empty-1")

    response = client.post("/api/interview/end", json={"interview_id": "empty-1", "session_id": "user-1"})
    assert response.status_code == 422


def test_interview_endpoints_reject_wrong_session(client):
    """A session may not access another session's interview (IDOR guard)."""
    _create_user_session()
    _create_interview("owned-1", session_id="user-1")

    # Detail endpoint: wrong session_id → 403
    detail = client.get("/api/interview/owned-1", params={"session_id": "user-2"})
    assert detail.status_code == 403

    # End endpoint: wrong session_id → 403
    ended = client.post("/api/interview/end", json={"interview_id": "owned-1", "session_id": "user-2"})
    assert ended.status_code == 403

    # Correct session_id still works (detail returns 200)
    detail_ok = client.get("/api/interview/owned-1", params={"session_id": "user-1"})
    assert detail_ok.status_code == 200
