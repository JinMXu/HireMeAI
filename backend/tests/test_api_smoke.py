from fastapi.testclient import TestClient

from app.utils import db


def test_health_and_parse_text_smoke(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "hireme.db")

    from app.main import app

    resume_text = "Experienced backend engineer with Python, FastAPI, SQLite, React, and AI workflow experience."

    with TestClient(app) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok"}

        parsed = client.post("/api/resume/parse-text", json={"text": resume_text})
        assert parsed.status_code == 200
        payload = parsed.json()
        assert payload["session_id"]
        assert payload["filename"] == "pasted_text"
        assert payload["text"] == resume_text
        assert payload["char_count"] == len(resume_text)
