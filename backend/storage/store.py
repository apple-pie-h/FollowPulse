from __future__ import annotations

from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4


BASE_DIR = Path(__file__).resolve().parent.parent
EXPORTS_DIR = BASE_DIR / "storage" / "exports"
UPLOADS_DIR = BASE_DIR / "storage" / "uploads"
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

_session_lock = Lock()
_job_lock = Lock()

_sessions: dict[str, dict[str, Any]] = {}
_jobs: dict[str, dict[str, Any]] = {}


def create_session(payload: dict[str, Any]) -> str:
    session_id = uuid4().hex
    with _session_lock:
        _sessions[session_id] = payload
    return session_id


def get_session(session_id: str) -> dict[str, Any] | None:
    with _session_lock:
        return _sessions.get(session_id)


def update_session(session_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    with _session_lock:
        session = _sessions.get(session_id)
        if session is None:
            return None
        session.update(updates)
        return session


def create_job(payload: dict[str, Any]) -> str:
    job_id = uuid4().hex
    with _job_lock:
        _jobs[job_id] = payload
    return job_id


def get_job(job_id: str) -> dict[str, Any] | None:
    with _job_lock:
        return _jobs.get(job_id)


def update_job(job_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    with _job_lock:
        job = _jobs.get(job_id)
        if job is None:
            return None
        job.update(updates)
        return job

