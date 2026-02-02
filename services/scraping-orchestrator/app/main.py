import json
import os
from datetime import datetime
from typing import Dict, List, Optional

import pika
from fastapi import Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
ALL_ROLES = {"user", "admin", "developer"}


class JobCreateRequest(BaseModel):
    service_name: str
    direction_id: int


class JobResponse(BaseModel):
    id: int
    service_name: str
    direction_id: int
    status: str
    created_at: datetime


class JobStatusResponse(BaseModel):
    id: int
    service_name: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None


class JobListItem(BaseModel):
    id: int
    service_name: str
    direction_id: int
    status: str
    created_at: datetime


class ServiceConfig(BaseModel):
    proxies: List[str] = []
    api_key: Optional[str] = None
    requests_per_min: Optional[int] = None
    concurrency: Optional[int] = None


class ServiceConfigUpdate(BaseModel):
    proxies: Optional[List[str]] = None
    api_key: Optional[str] = None
    requests_per_min: Optional[int] = None
    concurrency: Optional[int] = None


app = FastAPI(title="TASPA Scraping Orchestrator")
app.router.redirect_slashes = False

SCRAPER_CONFIG: Dict[str, ServiceConfig] = {
    "vk": ServiceConfig(),
    "instagram": ServiceConfig(),
    "tiktok": ServiceConfig(),
}


def _get_roles(request: Request) -> List[str]:
    roles_header = request.headers.get("X-Roles", "")
    roles = [r.strip() for r in roles_header.split(",") if r.strip()]
    if not roles:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing roles")
    return roles


def require_developer(request: Request) -> List[str]:
    roles = _get_roles(request)
    if "developer" not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Developer only")
    return roles


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _publish_job(payload: dict) -> None:
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange="scrape.jobs", exchange_type="fanout", durable=True)
    channel.basic_publish(
        exchange="scrape.jobs",
        routing_key="",
        body=json.dumps(payload).encode("utf-8"),
        properties=pika.BasicProperties(content_type="application/json"),
    )
    connection.close()


@app.post("/scrape/jobs", response_model=JobResponse)
def create_job(
    data: JobCreateRequest, _: List[str] = Depends(require_developer)
) -> JobResponse:
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                INSERT INTO scrape_jobs (service_name, direction_id, status, created_at)
                VALUES (:service_name, :direction_id, :status, :created_at)
                RETURNING id, created_at
                """
            ),
            {
                "service_name": data.service_name,
                "direction_id": data.direction_id,
                "status": "queued",
                "created_at": datetime.utcnow(),
            },
        )
        row = result.fetchone()
        job_id = row[0]
        created_at = row[1]

    _publish_job(
        {
            "job_id": job_id,
            "service_name": data.service_name,
            "direction_id": data.direction_id,
        }
    )

    return JobResponse(
        id=job_id,
        service_name=data.service_name,
        direction_id=data.direction_id,
        status="queued",
        created_at=created_at,
    )


@app.get("/scrape/jobs/{job_id}", response_model=JobStatusResponse)
def job_status(job_id: int, _: List[str] = Depends(require_developer)) -> JobStatusResponse:
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, service_name, status, started_at, finished_at
                FROM scrape_jobs
                WHERE id = :id
                """
            ),
            {"id": job_id},
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return JobStatusResponse(
        id=row[0], service_name=row[1], status=row[2], started_at=row[3], finished_at=row[4]
    )


@app.get("/scrape/jobs", response_model=list[JobListItem])
def list_jobs(_: List[str] = Depends(require_developer)) -> list[JobListItem]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, service_name, direction_id, status, created_at
                FROM scrape_jobs
                ORDER BY id DESC
                LIMIT 200
                """
            )
        ).fetchall()
    return [
        JobListItem(
            id=row[0],
            service_name=row[1],
            direction_id=row[2],
            status=row[3],
            created_at=row[4],
        )
        for row in rows
    ]


@app.get("/scrape/config", response_model=Dict[str, ServiceConfig])
def get_config(_: List[str] = Depends(require_developer)) -> Dict[str, ServiceConfig]:
    return SCRAPER_CONFIG


@app.get("/scrape/config/{service_name}", response_model=ServiceConfig)
def get_service_config(
    service_name: str, _: List[str] = Depends(require_developer)
) -> ServiceConfig:
    config = SCRAPER_CONFIG.get(service_name)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown service")
    return config


@app.put("/scrape/config/{service_name}", response_model=ServiceConfig)
def update_service_config(
    service_name: str,
    data: ServiceConfigUpdate,
    _: List[str] = Depends(require_developer),
) -> ServiceConfig:
    config = SCRAPER_CONFIG.get(service_name)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown service")
    if data.proxies is not None:
        config.proxies = data.proxies
    if data.api_key is not None:
        config.api_key = data.api_key
    if data.requests_per_min is not None:
        config.requests_per_min = data.requests_per_min
    if data.concurrency is not None:
        config.concurrency = data.concurrency
    SCRAPER_CONFIG[service_name] = config
    return config


@app.post("/scrape/jobs/{job_id}/stop")
def stop_job(job_id: int, _: List[str] = Depends(require_developer)) -> dict:
    with engine.begin() as conn:
        result = conn.execute(
            text(
                """
                UPDATE scrape_jobs
                SET status = :status, finished_at = :finished_at
                WHERE id = :id
                """
            ),
            {"status": "stopped", "finished_at": datetime.utcnow(), "id": job_id},
        )
        if result.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return {"status": "stopped"}
