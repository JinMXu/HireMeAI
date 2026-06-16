import sqlite3
import json
import logging
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parents[2] / "hireme.db"


MIGRATIONS: list[tuple[int, str, str]] = [
    (
        1,
        "initial_schema",
        """
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            resume_text TEXT DEFAULT '',
            resume_filename TEXT DEFAULT '',
            jd_text TEXT DEFAULT '',
            scores TEXT DEFAULT '{}',
            optimized_resume TEXT DEFAULT '',
            jd_match_result TEXT DEFAULT '{}',
            jd_optimized_text TEXT DEFAULT '',
            cover_letter TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS interview_sessions (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT '1v1',
            difficulty TEXT NOT NULL DEFAULT 'intermediate',
            interviewers TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            ended_at TEXT
        );

        CREATE TABLE IF NOT EXISTS interview_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id TEXT NOT NULL,
            role TEXT NOT NULL,
            agent_id TEXT,
            agent_name TEXT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (interview_id) REFERENCES interview_sessions(id)
        );

        CREATE TABLE IF NOT EXISTS interview_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interview_id TEXT NOT NULL UNIQUE,
            report TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (interview_id) REFERENCES interview_sessions(id)
        );

        CREATE INDEX IF NOT EXISTS idx_messages_interview ON interview_messages(interview_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user ON interview_sessions(session_id);
        """,
    ),
]


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    try:
        _apply_migrations(conn)
    finally:
        conn.close()
    logger.info("Database initialized at %s", DB_PATH)


def _apply_migrations(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        )
    """)
    applied = {
        row["version"]
        for row in conn.execute("SELECT version FROM schema_migrations").fetchall()
    }

    for version, name, sql in MIGRATIONS:
        if version in applied:
            continue
        logger.info("Applying database migration %s: %s", version, name)
        conn.executescript(sql)
        conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
            (version, name, _now()),
        )
        conn.commit()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── user_sessions ─────────────────────────────────────────────────

def upsert_user_session(session_id: str, **fields):
    conn = get_db()
    existing = conn.execute("SELECT id FROM user_sessions WHERE id=?", (session_id,)).fetchone()
    if existing:
        set_clause = ", ".join(f"{k}=?" for k in fields)
        values = list(fields.values()) + [session_id]
        conn.execute(f"UPDATE user_sessions SET updated_at=?, {set_clause} WHERE id=?",
                     [_now()] + values)
    else:
        keys = ["id", "created_at", "updated_at"] + list(fields.keys())
        placeholders = ", ".join("?" for _ in keys)
        values = [session_id, _now(), _now()] + list(fields.values())
        conn.execute(f"INSERT INTO user_sessions ({', '.join(keys)}) VALUES ({placeholders})", values)
    conn.commit()
    conn.close()


def get_user_session(session_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM user_sessions WHERE id=?", (session_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return dict(row)


def delete_user_session(session_id: str):
    conn = get_db()
    conn.execute("DELETE FROM user_sessions WHERE id=?", (session_id,))
    conn.commit()
    conn.close()


# ── interview_sessions ────────────────────────────────────────────

def _serialize(obj):
    """Convert Pydantic models to dicts for JSON storage."""
    if hasattr(obj, 'model_dump'):
        return obj.model_dump()
    return obj

def create_interview_session(interview_id: str, data: dict):
    conn = get_db()
    interviewers = data.get("interviewers", [])
    interviewers_json = json.dumps([_serialize(iv) for iv in interviewers])
    conn.execute(
        """INSERT INTO interview_sessions (id, session_id, mode, difficulty, interviewers, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'active', ?)""",
        (interview_id, data["session_id"], data.get("mode", "1v1"),
         data.get("difficulty", "intermediate"), interviewers_json,
         _now()),
    )
    conn.commit()
    conn.close()


def get_interview_session_db(interview_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT * FROM interview_sessions WHERE id=?", (interview_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    d = dict(row)
    d["interviewers"] = json.loads(d.get("interviewers", "[]"))
    return d


def update_interview_status(interview_id: str, status: str):
    conn = get_db()
    if status == "completed":
        conn.execute("UPDATE interview_sessions SET status=?, ended_at=? WHERE id=?",
                     (status, _now(), interview_id))
    else:
        conn.execute("UPDATE interview_sessions SET status=? WHERE id=?", (status, interview_id))
    conn.commit()
    conn.close()


def list_interviews_by_user(session_id: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT id, mode, difficulty, status, created_at, ended_at FROM interview_sessions WHERE session_id=? ORDER BY created_at DESC",
        (session_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── interview_messages ────────────────────────────────────────────

def save_interview_message(interview_id: str, msg: dict):
    conn = get_db()
    conn.execute(
        """INSERT INTO interview_messages (interview_id, role, agent_id, agent_name, content, created_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (interview_id, msg["role"], msg.get("agent_id"), msg.get("agent_name"),
         msg["content"], _now()),
    )
    conn.commit()
    conn.close()


def get_interview_messages(interview_id: str) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT role, agent_id, agent_name, content FROM interview_messages WHERE interview_id=? ORDER BY id ASC",
        (interview_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── interview_reports ─────────────────────────────────────────────

def save_interview_report(interview_id: str, report: dict):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO interview_reports (interview_id, report, created_at) VALUES (?, ?, ?)",
        (interview_id, json.dumps(report), _now()),
    )
    conn.commit()
    conn.close()


def get_interview_report(interview_id: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT report FROM interview_reports WHERE interview_id=?", (interview_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return json.loads(row["report"])
