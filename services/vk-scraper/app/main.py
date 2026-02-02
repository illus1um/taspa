import json
import os
import threading
from datetime import datetime

import httpx
import pika
from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
RABBITMQ_URL = os.getenv("RABBITMQ_URL", "")
REALTIME_LOG_URL = os.getenv("REALTIME_LOG_URL", "http://realtime-log-service:8010")
ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://scraping-orchestrator:8005")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)


class JobPayload(BaseModel):
    job_id: int
    service_name: str
    direction_id: int


app = FastAPI(title="TASPA VK Scraper")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _update_job_status(job_id: int, status: str) -> None:
    with engine.begin() as conn:
        if status == "running":
            conn.execute(
                text(
                    """
                    UPDATE scrape_jobs
                    SET status = :status, started_at = :started_at
                    WHERE id = :id
                    """
                ),
                {"status": status, "started_at": datetime.utcnow(), "id": job_id},
            )
        else:
            conn.execute(
                text(
                    """
                    UPDATE scrape_jobs
                    SET status = :status, finished_at = :finished_at
                    WHERE id = :id
                    """
                ),
                {"status": status, "finished_at": datetime.utcnow(), "id": job_id},
            )


def _load_vk_group_sources(direction_id: int) -> list[str]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT source_identifier
                FROM direction_sources
                WHERE direction_id = :direction_id
                  AND source_type = 'vk_group'
                ORDER BY id
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    return [row[0] for row in rows]


def _register_vk_group(direction_id: int, vk_group_id: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO vk_groups (direction_id, vk_group_id)
                VALUES (:direction_id, :vk_group_id)
                ON CONFLICT (direction_id, vk_group_id) DO NOTHING
                """
            ),
            {"direction_id": direction_id, "vk_group_id": vk_group_id},
        )


def _send_log(job_id: int, level: str, message: str) -> None:
    try:
        httpx.post(
            f"{REALTIME_LOG_URL}/logs",
            json={"job_id": job_id, "level": level, "message": message},
            headers={"X-Roles": "developer"},
            timeout=5.0,
        )
    except Exception:
        return None


def _fetch_config() -> dict:
    try:
        resp = httpx.get(
            f"{ORCHESTRATOR_URL.rstrip('/')}/scrape/config/vk",
            headers={"X-Roles": "developer"},
            timeout=5.0,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return {}


def _consume_jobs() -> None:
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.exchange_declare(exchange="scrape.jobs", exchange_type="fanout", durable=True)
    queue = channel.queue_declare(queue="", exclusive=True)
    queue_name = queue.method.queue
    channel.queue_bind(exchange="scrape.jobs", queue=queue_name)

    for method, properties, body in channel.consume(queue=queue_name, inactivity_timeout=1):
        if body is None:
            continue
        payload = json.loads(body.decode("utf-8"))
        job = JobPayload(**payload)
        if job.service_name != "vk":
            channel.basic_ack(method.delivery_tag)
            continue

        try:
            _update_job_status(job.job_id, "running")
            _send_log(job.job_id, "info", "VK scrape started")

            config = _fetch_config()
            if config:
                proxies = config.get("proxies") or []
                _send_log(
                    job.job_id,
                    "info",
                    "VK config loaded: "
                    f"proxies={len(proxies)}, "
                    f"rpm={config.get('requests_per_min')}, "
                    f"concurrency={config.get('concurrency')}",
                )

            sources = _load_vk_group_sources(job.direction_id)
            _send_log(job.job_id, "info", f"VK sources loaded: {len(sources)}")

            for idx, group_id in enumerate(sources, start=1):
                _register_vk_group(job.direction_id, group_id)
                if idx % 10 == 0 or idx == len(sources):
                    _send_log(job.job_id, "info", f"VK sources processed: {idx}")

            _send_log(job.job_id, "info", "VK scrape finished")
            _update_job_status(job.job_id, "finished")
        except Exception as exc:
            _send_log(job.job_id, "error", f"VK scrape failed: {exc}")
            _update_job_status(job.job_id, "failed")
        finally:
            channel.basic_ack(method.delivery_tag)

    connection.close()


@app.on_event("startup")
def start_consumer() -> None:
    thread = threading.Thread(target=_consume_jobs, daemon=True)
    thread.start()
