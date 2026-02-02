import os
from datetime import datetime
from typing import List, Optional
from urllib.parse import parse_qs

import socketio
from fastapi import Depends, FastAPI, HTTPException, Request, status
from jose import jwt
from pydantic import BaseModel
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

ALL_ROLES = {"user", "admin", "developer"}

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
fastapi_app = FastAPI(title="TASPA Realtime Log Service")
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)


class LogEvent(BaseModel):
    job_id: int
    level: str
    message: str


def _get_roles(request: Request) -> List[str]:
    roles_header = request.headers.get("X-Roles", "")
    roles = [r.strip() for r in roles_header.split(",") if r.strip()]
    if not roles:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing roles")
    return roles


def require_any_role(request: Request) -> List[str]:
    roles = _get_roles(request)
    if not set(roles).intersection(ALL_ROLES):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return roles


@sio.event
async def connect(sid, environ):
    query = parse_qs(environ.get("QUERY_STRING", ""))
    job_id = query.get("job_id", [None])[0]
    token = query.get("token", [None])[0]
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            roles = payload.get("roles", [])
            if roles:
                await sio.enter_room(sid, "authorized")
        except Exception:
            pass
    if job_id:
        await sio.enter_room(sid, f"job:{job_id}")


@sio.event
async def disconnect(sid):
    return None


@fastapi_app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _store_log(job_id: int, level: str, message: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO scrape_logs (job_id, level, message, created_at)
                VALUES (:job_id, :level, :message, :created_at)
                """
            ),
            {
                "job_id": job_id,
                "level": level,
                "message": message,
                "created_at": datetime.utcnow(),
            },
        )


@fastapi_app.post("/logs")
async def ingest_log(
    data: LogEvent, _: List[str] = Depends(require_any_role)
) -> dict:
    _store_log(data.job_id, data.level, data.message)
    payload = {
        "job_id": data.job_id,
        "level": data.level,
        "message": data.message,
        "created_at": datetime.utcnow().isoformat(),
    }
    await sio.emit("log", payload, room=f"job:{data.job_id}")
    await sio.emit("log", payload, room="authorized")
    return {"status": "ok"}


@fastapi_app.post("/logs/broadcast")
async def broadcast_log(
    data: LogEvent, _: List[str] = Depends(require_any_role)
) -> dict:
    payload = {
        "job_id": data.job_id,
        "level": data.level,
        "message": data.message,
        "created_at": datetime.utcnow().isoformat(),
    }
    await sio.emit("log", payload)
    return {"status": "ok"}
