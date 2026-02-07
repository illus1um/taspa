import csv
import io
import json
import os
from datetime import datetime
from typing import Dict, List, Optional

import pika
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
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


class ImportResponse(BaseModel):
    direction_id: int
    platform: str
    imported: int
    updated: int
    errors: List[str]


def _ensure_direction_source(conn, direction_id: int, source_type: str, source_identifier: str):
    """Adds a source to direction_sources if it doesn't exist."""
    conn.execute(
        text(
            """
            INSERT INTO direction_sources (direction_id, source_type, source_identifier)
            VALUES (:direction_id, :source_type, :source_identifier)
            ON CONFLICT (direction_id, source_type, source_identifier) DO NOTHING
            """
        ),
        {
            "direction_id": direction_id,
            "source_type": source_type,
            "source_identifier": source_identifier,
        },
    )


def _parse_date(date_str: str) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        # Try YYYY:MM:DD or YYYY-MM-DD
        formatted = date_str.replace(":", "-")
        return datetime.fromisoformat(formatted)
    except Exception:
        return None


@app.post("/scrape/import/vk-csv", response_model=ImportResponse)
async def import_vk_csv(
    direction_id: int,
    file: UploadFile = File(...),
    _: List[str] = Depends(require_developer),
) -> ImportResponse:
    # Check direction
    with engine.connect() as conn:
        dir_row = conn.execute(
            text("SELECT id FROM directions WHERE id = :id"), {"id": direction_id}
        ).fetchone()
        if not dir_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Direction not found")

    try:
        content = await file.read()
        text_content = content.decode("utf-8-sig")
        csv_reader = list(csv.DictReader(io.StringIO(text_content)))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid CSV file: {str(e)}"
        )

    return await _process_vk_records(direction_id, csv_reader)


@app.post("/scrape/import/vk-json", response_model=ImportResponse)
async def import_vk_json(
    direction_id: int,
    file: UploadFile = File(...),
    _: List[str] = Depends(require_developer),
) -> ImportResponse:
    try:
        content = await file.read()
        data = json.loads(content)
        records = data.get("records", []) if isinstance(data, dict) else data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON: {str(e)}"
        )

    return await _process_vk_records(direction_id, records)


async def _process_vk_records(direction_id: int, records: List[dict]) -> ImportResponse:
    imported = 0
    updated = 0
    errors = []
    scraped_at = datetime.utcnow()

    with engine.begin() as conn:
        for idx, row in enumerate(records, start=2):
            try:
                # Map fields from new structure
                # id, group, group_link, user_id, name, sex, age, city, univ, school, last_recently, data_timestap
                vk_user_id = str(row.get("user_id", row.get("VK_ID", ""))).strip()
                full_name = str(row.get("name", row.get("ФИО", ""))).strip()
                gender_raw = str(row.get("sex", row.get("Пол", ""))).strip()
                group_name = str(row.get("group", row.get("Группа", ""))).strip()
                group_url = str(row.get("group_link", "")).strip()
                age = row.get("age")
                city = row.get("city")
                university = row.get("univ")
                school = row.get("school")
                last_recently = _parse_date(str(row.get("last_recently", "")))
                data_timestamp = _parse_date(str(row.get("data_timestap", "")))

                if not vk_user_id:
                    errors.append(f"Row {idx}: missing user_id")
                    continue

                if not group_name:
                    errors.append(f"Row {idx}: missing group")
                    continue

                # Group identifier for DB (use group_url or group_name)
                # If group_url is a full link, maybe extract the slug? 
                # For now let's use group_name or slug from URL as the unique ID if possible
                vk_group_id = group_url.split("/")[-1] if "/" in group_url else group_name

                # Sync with direction_sources
                _ensure_direction_source(conn, direction_id, "vk_group", vk_group_id)

                # Create/Update group
                group_row = conn.execute(
                    text(
                        """
                        SELECT id FROM vk_groups
                        WHERE direction_id = :direction_id AND vk_group_id = :vk_group_id
                        """
                    ),
                    {"direction_id": direction_id, "vk_group_id": vk_group_id},
                ).fetchone()

                if not group_row:
                    result = conn.execute(
                        text(
                            """
                            INSERT INTO vk_groups (direction_id, vk_group_id, name, url, scraped_at)
                            VALUES (:direction_id, :vk_group_id, :name, :url, :scraped_at)
                            RETURNING id
                            """
                        ),
                        {
                            "direction_id": direction_id,
                            "vk_group_id": vk_group_id,
                            "name": group_name,
                            "url": group_url,
                            "scraped_at": scraped_at,
                        },
                    )
                    group_db_id = result.fetchone()[0]
                else:
                    group_db_id = group_row[0]
                    conn.execute(
                        text(
                            """
                            UPDATE vk_groups
                            SET name = :name, url = :url, scraped_at = :scraped_at
                            WHERE id = :id
                            """
                        ),
                        {
                            "name": group_name,
                            "url": group_url,
                            "scraped_at": scraped_at,
                            "id": group_db_id,
                        },
                    )

                # Convert gender
                gender = None
                if gender_raw:
                    g = gender_raw.lower()
                    if g in ["m", "м", "male", "мужской"]:
                        gender = "male"
                    elif g in ["f", "ж", "female", "женский"]:
                        gender = "female"

                # Check member
                existing = conn.execute(
                    text(
                        "SELECT id FROM vk_members WHERE vk_group_id = :gid AND vk_user_id = :uid"
                    ),
                    {"gid": group_db_id, "uid": vk_user_id},
                ).fetchone()

                member_data = {
                    "full_name": full_name or None,
                    "gender": gender,
                    "age": int(age) if age and str(age).isdigit() else None,
                    "city": city,
                    "university": university,
                    "school": school,
                    "last_recently": last_recently,
                    "data_timestamp": data_timestamp or scraped_at,
                    "scraped_at": scraped_at,
                }

                if existing:
                    conn.execute(
                        text(
                            """
                            UPDATE vk_members
                            SET full_name = :full_name, gender = :gender, age = :age,
                                city = :city, university = :university, school = :school,
                                last_recently = :last_recently, data_timestamp = :data_timestamp,
                                scraped_at = :scraped_at
                            WHERE id = :id
                            """
                        ),
                        {**member_data, "id": existing[0]},
                    )
                    updated += 1
                else:
                    conn.execute(
                        text(
                            """
                            INSERT INTO vk_members (
                                vk_group_id, vk_user_id, full_name, gender, age, 
                                city, university, school, last_recently, data_timestamp, scraped_at
                            )
                            VALUES (
                                :vk_group_id, :vk_user_id, :full_name, :gender, :age,
                                :city, :university, :school, :last_recently, :data_timestamp, :scraped_at
                            )
                            """
                        ),
                        {"vk_group_id": group_db_id, "vk_user_id": vk_user_id, **member_data},
                    )
                    imported += 1

            except Exception as e:
                errors.append(f"Record {idx}: {str(e)}")
                continue

    return ImportResponse(
        direction_id=direction_id,
        platform="vk",
        imported=imported,
        updated=updated,
        errors=errors[:50],
    )


@app.post("/scrape/import/instagram-csv", response_model=ImportResponse)
async def import_instagram_csv(
    direction_id: int,
    file: UploadFile = File(...),
    _: List[str] = Depends(require_developer),
) -> ImportResponse:
    try:
        content = await file.read()
        text_content = content.decode("utf-8-sig")
        csv_reader = list(csv.DictReader(io.StringIO(text_content)))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
    return await _process_social_records(direction_id, "instagram", csv_reader)


@app.post("/scrape/import/instagram-json", response_model=ImportResponse)
async def import_instagram_json(
    direction_id: int,
    file: UploadFile = File(...),
    _: List[str] = Depends(require_developer),
) -> ImportResponse:
    try:
        content = await file.read()
        records = json.loads(content)
        if isinstance(records, dict): records = records.get("records", [])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    return await _process_social_records(direction_id, "instagram", records)


@app.post("/scrape/import/tiktok-csv", response_model=ImportResponse)
async def import_tiktok_csv(
    direction_id: int,
    file: UploadFile = File(...),
    _: List[str] = Depends(require_developer),
) -> ImportResponse:
    try:
        content = await file.read()
        text_content = content.decode("utf-8-sig")
        csv_reader = list(csv.DictReader(io.StringIO(text_content)))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {str(e)}")
    return await _process_social_records(direction_id, "tiktok", csv_reader)


@app.post("/scrape/import/tiktok-json", response_model=ImportResponse)
async def import_tiktok_json(
    direction_id: int,
    file: UploadFile = File(...),
    _: List[str] = Depends(require_developer),
) -> ImportResponse:
    try:
        content = await file.read()
        records = json.loads(content)
        if isinstance(records, dict): records = records.get("records", [])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    return await _process_social_records(direction_id, "tiktok", records)


async def _process_social_records(direction_id: int, platform: str, records: List[dict]) -> ImportResponse:
    imported = 0
    updated = 0
    errors = []
    scraped_at = datetime.utcnow()
    
    table_acc = f"{platform}_accounts"
    table_usr = f"{platform}_users"
    source_type = f"{platform}_account"
    fk_field = f"{platform}_account_id"

    with engine.begin() as conn:
        for idx, row in enumerate(records, start=2):
            try:
                # id, group_name, username, link, sex, city, data_timestap
                username = str(row.get("username", "")).strip()
                group_name = str(row.get("group_name", "")).strip()
                link = str(row.get("link", "")).strip()
                sex = str(row.get("sex", "")).strip()
                city = str(row.get("city", "")).strip()
                data_timestamp = _parse_date(str(row.get("data_timestap", "")))

                if not username:
                    errors.append(f"Row {idx}: missing username")
                    continue

                # Account is the "source"
                # If group_name is provided, use it as the source identifier, otherwise username
                source_id = group_name if group_name else username
                _ensure_direction_source(conn, direction_id, source_type, source_id)

                # Sync account
                acc = conn.execute(
                    text(f"SELECT id FROM {table_acc} WHERE direction_id = :did AND username = :u"),
                    {"did": direction_id, "u": source_id}
                ).fetchone()

                if not acc:
                    res = conn.execute(
                        text(f"INSERT INTO {table_acc} (direction_id, username, url, name, scraped_at) "
                             "VALUES (:did, :u, :l, :n, :s) RETURNING id"),
                        {"did": direction_id, "u": source_id, "l": link, "n": group_name, "s": scraped_at}
                    )
                    acc_id = res.fetchone()[0]
                else:
                    acc_id = acc[0]
                    conn.execute(
                        text(f"UPDATE {table_acc} SET url = :l, name = :n, scraped_at = :s WHERE id = :id"),
                        {"l": link, "n": group_name, "s": scraped_at, "id": acc_id}
                    )

                # Sync user
                existing = conn.execute(
                    text(f"SELECT id FROM {table_usr} WHERE {fk_field} = :aid AND username = :u"),
                    {"aid": acc_id, "u": username}
                ).fetchone()

                usr_data = {
                    "username": username,
                    "url": link,
                    "sex": sex,
                    "city": city,
                    "data_timestamp": data_timestamp or scraped_at,
                    "scraped_at": scraped_at
                }

                if existing:
                    conn.execute(
                        text(f"UPDATE {table_usr} SET url = :url, sex = :sex, city = :city, "
                             "data_timestamp = :data_timestamp, scraped_at = :scraped_at WHERE id = :id"),
                        {**usr_data, "id": existing[0]}
                    )
                    updated += 1
                else:
                    conn.execute(
                        text(f"INSERT INTO {table_usr} ({fk_field}, username, url, sex, city, data_timestamp, scraped_at) "
                             f"VALUES (:aid, :username, :url, :sex, :city, :data_timestamp, :scraped_at)"),
                        {"aid": acc_id, **usr_data}
                    )
                    imported += 1

            except Exception as e:
                errors.append(f"Record {idx}: {str(e)}")
    
    return ImportResponse(direction_id=direction_id, platform=platform, imported=imported, updated=updated, errors=errors[:50])
