import os
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

ALLOWED_SOURCE_TYPES = {"vk_group", "instagram_account", "tiktok_account"}
ALL_ROLES = {"user", "admin", "developer"}


class DirectionCreate(BaseModel):
    name: str


class DirectionUpdate(BaseModel):
    name: str


class DirectionResponse(BaseModel):
    id: int
    name: str


class SourceCreate(BaseModel):
    source_type: str
    source_identifier: str


class SourceResponse(BaseModel):
    id: int
    direction_id: int
    source_type: str
    source_identifier: str


app = FastAPI(title="TASPA Direction Service")


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


def require_admin(request: Request) -> List[str]:
    roles = _get_roles(request)
    if "admin" not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return roles


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/directions", response_model=List[DirectionResponse])
def list_directions(_: List[str] = Depends(require_any_role)) -> List[DirectionResponse]:
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name FROM directions ORDER BY name")).fetchall()
    return [DirectionResponse(id=row[0], name=row[1]) for row in rows]


@app.post("/directions", response_model=DirectionResponse)
def create_direction(
    data: DirectionCreate, _: List[str] = Depends(require_admin)
) -> DirectionResponse:
    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT id FROM directions WHERE name = :name"),
            {"name": data.name},
        ).fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Direction exists")
        result = conn.execute(
            text("INSERT INTO directions (name) VALUES (:name) RETURNING id"),
            {"name": data.name},
        )
        direction_id = result.fetchone()[0]
    return DirectionResponse(id=direction_id, name=data.name)


@app.get("/directions/{direction_id}", response_model=DirectionResponse)
def get_direction(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> DirectionResponse:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, name FROM directions WHERE id = :id"),
            {"id": direction_id},
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return DirectionResponse(id=row[0], name=row[1])


@app.put("/directions/{direction_id}", response_model=DirectionResponse)
def update_direction(
    direction_id: int,
    data: DirectionUpdate,
    _: List[str] = Depends(require_admin),
) -> DirectionResponse:
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id FROM directions WHERE id = :id"),
            {"id": direction_id},
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        conn.execute(
            text("UPDATE directions SET name = :name WHERE id = :id"),
            {"id": direction_id, "name": data.name},
        )
    return DirectionResponse(id=direction_id, name=data.name)


@app.delete("/directions/{direction_id}")
def delete_direction(
    direction_id: int, _: List[str] = Depends(require_admin)
) -> dict:
    with engine.begin() as conn:
        result = conn.execute(
            text("DELETE FROM directions WHERE id = :id"),
            {"id": direction_id},
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return {"status": "deleted"}


@app.get("/directions/{direction_id}/sources", response_model=List[SourceResponse])
def list_sources(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> List[SourceResponse]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, direction_id, source_type, source_identifier
                FROM direction_sources
                WHERE direction_id = :id
                ORDER BY id
                """
            ),
            {"id": direction_id},
        ).fetchall()
    return [
        SourceResponse(
            id=row[0],
            direction_id=row[1],
            source_type=row[2],
            source_identifier=row[3],
        )
        for row in rows
    ]


@app.post("/directions/{direction_id}/sources", response_model=SourceResponse)
def add_source(
    direction_id: int,
    data: SourceCreate,
    _: List[str] = Depends(require_admin),
) -> SourceResponse:
    if data.source_type not in ALLOWED_SOURCE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid source type")
    with engine.begin() as conn:
        direction = conn.execute(
            text("SELECT id FROM directions WHERE id = :id"),
            {"id": direction_id},
        ).fetchone()
        if not direction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Direction not found")

        existing = conn.execute(
            text(
                """
                SELECT id
                FROM direction_sources
                WHERE direction_id = :id
                  AND source_type = :source_type
                  AND source_identifier = :source_identifier
                """
            ),
            {
                "id": direction_id,
                "source_type": data.source_type,
                "source_identifier": data.source_identifier,
            },
        ).fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Source exists")

        result = conn.execute(
            text(
                """
                INSERT INTO direction_sources (direction_id, source_type, source_identifier)
                VALUES (:direction_id, :source_type, :source_identifier)
                RETURNING id
                """
            ),
            {
                "direction_id": direction_id,
                "source_type": data.source_type,
                "source_identifier": data.source_identifier,
            },
        )
        source_id = result.fetchone()[0]

    return SourceResponse(
        id=source_id,
        direction_id=direction_id,
        source_type=data.source_type,
        source_identifier=data.source_identifier,
    )


@app.delete("/directions/{direction_id}/sources/{source_id}")
def delete_source(
    direction_id: int,
    source_id: int,
    _: List[str] = Depends(require_admin),
) -> dict:
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                DELETE FROM direction_sources
                WHERE id = :source_id AND direction_id = :direction_id
                """
            ),
            {"source_id": source_id, "direction_id": direction_id},
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return {"status": "deleted"}
