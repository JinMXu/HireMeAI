from app.utils import db


def test_init_db_applies_migrations_once(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "hireme.db")

    db.init_db()
    db.init_db()

    conn = db.get_db()
    try:
        migrations = conn.execute(
            "SELECT version, name FROM schema_migrations ORDER BY version"
        ).fetchall()
        user_tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='user_sessions'"
        ).fetchall()
    finally:
        conn.close()

    assert [tuple(row) for row in migrations] == [(1, "initial_schema")]
    assert len(user_tables) == 1


def test_migrated_schema_supports_user_session_writes(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "hireme.db")
    db.init_db()

    db.upsert_user_session("session-1", resume_text="hello", cover_letter="letter")
    row = db.get_user_session("session-1")

    assert row is not None
    assert row["resume_text"] == "hello"
    assert row["cover_letter"] == "letter"
