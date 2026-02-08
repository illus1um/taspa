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
        # Try YYYY:MM:DD or YYYY-MM-DD (only replace colons in the date part, not time)
        parts = date_str.split(" ", 1)
        parts[0] = parts[0].replace(":", "-")
        formatted = " ".join(parts)
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
        # Auto-detect delimiter: tab or comma
        first_line = text_content.split("\n", 1)[0]
        delimiter = "\t" if "\t" in first_line else ","
        csv_reader = list(csv.DictReader(io.StringIO(text_content), delimiter=delimiter))
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


def _convert_gender(raw: str) -> Optional[str]:
    if not raw:
        return None
    g = raw.lower()
    if g in ("m", "м", "male", "мужской"):
        return "male"
    if g in ("f", "ж", "female", "женский"):
        return "female"
    return None


CHUNK_SIZE = 5000


async def _process_vk_records(direction_id: int, records: List[dict]) -> ImportResponse:
    imported = 0
    updated = 0
    errors = []
    scraped_at = datetime.utcnow()

    # ── Phase 1: Parse all rows in memory ──
    parsed_rows = []
    groups_seen: Dict[str, dict] = {}  # vk_group_id -> {name, url}

    for idx, row in enumerate(records, start=2):
        try:
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
            data_timestamp = _parse_date(str(row.get("data_timestamp", "")))

            if not vk_user_id:
                errors.append(f"Row {idx}: missing user_id")
                continue
            if not group_name:
                errors.append(f"Row {idx}: missing group")
                continue

            vk_group_id = group_url.split("/")[-1] if "/" in group_url else group_name
            groups_seen[vk_group_id] = {"name": group_name, "url": group_url}

            parsed_rows.append({
                "vk_group_id": vk_group_id,
                "vk_user_id": vk_user_id,
                "full_name": full_name or None,
                "gender": _convert_gender(gender_raw),
                "age": int(age) if age and str(age).isdigit() else None,
                "city": city if city else None,
                "university": university if university else None,
                "school": school if school else None,
                "last_recently": last_recently,
                "data_timestamp": data_timestamp or scraped_at,
                "scraped_at": scraped_at,
            })
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    if not parsed_rows:
        return ImportResponse(direction_id=direction_id, platform="vk",
                              imported=0, updated=0, errors=errors[:50])

    # ── Phase 2: Batch upsert groups (once) ──
    group_id_map: Dict[str, int] = {}  # vk_group_id -> db id

    with engine.begin() as conn:
        # Upsert direction_sources
        ds_values = [{"direction_id": direction_id, "source_type": "vk_group",
                       "source_identifier": gid} for gid in groups_seen]
        if ds_values:
            conn.execute(
                text("""
                    INSERT INTO direction_sources (direction_id, source_type, source_identifier)
                    VALUES (:direction_id, :source_type, :source_identifier)
                    ON CONFLICT (direction_id, source_type, source_identifier) DO NOTHING
                """),
                ds_values,
            )

        # Upsert vk_groups
        group_params = [
            {"direction_id": direction_id, "vk_group_id": gid,
             "name": info["name"], "url": info["url"], "scraped_at": scraped_at}
            for gid, info in groups_seen.items()
        ]
        if group_params:
            conn.execute(
                text("""
                    INSERT INTO vk_groups (direction_id, vk_group_id, name, url, scraped_at)
                    VALUES (:direction_id, :vk_group_id, :name, :url, :scraped_at)
                    ON CONFLICT (direction_id, vk_group_id)
                    DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url, scraped_at = EXCLUDED.scraped_at
                """),
                group_params,
            )

        # Fetch all group IDs in one query
        rows = conn.execute(
            text("SELECT vk_group_id, id FROM vk_groups WHERE direction_id = :did"),
            {"did": direction_id},
        ).fetchall()
        group_id_map = {r[0]: r[1] for r in rows}

    # ── Phase 3: Batch upsert members in chunks ──
    for chunk_start in range(0, len(parsed_rows), CHUNK_SIZE):
        chunk = parsed_rows[chunk_start:chunk_start + CHUNK_SIZE]
        member_params = []
        for r in chunk:
            db_group_id = group_id_map.get(r["vk_group_id"])
            if not db_group_id:
                continue
            member_params.append({
                "vk_group_id": db_group_id,
                "vk_user_id": r["vk_user_id"],
                "full_name": r["full_name"],
                "gender": r["gender"],
                "age": r["age"],
                "city": r["city"],
                "university": r["university"],
                "school": r["school"],
                "last_recently": r["last_recently"],
                "data_timestamp": r["data_timestamp"],
                "scraped_at": r["scraped_at"],
            })

        if not member_params:
            continue

        with engine.begin() as conn:
            # Use a temp table to determine imported vs updated counts
            conn.execute(text("""
                CREATE TEMP TABLE _vk_staging (
                    vk_group_id BIGINT,
                    vk_user_id TEXT,
                    full_name TEXT,
                    gender TEXT,
                    age INTEGER,
                    city TEXT,
                    university TEXT,
                    school TEXT,
                    last_recently TIMESTAMPTZ,
                    data_timestamp TIMESTAMPTZ,
                    scraped_at TIMESTAMPTZ
                ) ON COMMIT DROP
            """))

            conn.execute(
                text("""
                    INSERT INTO _vk_staging (vk_group_id, vk_user_id, full_name, gender, age,
                        city, university, school, last_recently, data_timestamp, scraped_at)
                    VALUES (:vk_group_id, :vk_user_id, :full_name, :gender, :age,
                        :city, :university, :school, :last_recently, :data_timestamp, :scraped_at)
                """),
                member_params,
            )

            result = conn.execute(text("""
                INSERT INTO vk_members (vk_group_id, vk_user_id, full_name, gender, age,
                    city, university, school, last_recently, data_timestamp, scraped_at)
                SELECT s.vk_group_id, s.vk_user_id, s.full_name, s.gender, s.age,
                    s.city, s.university, s.school, s.last_recently, s.data_timestamp, s.scraped_at
                FROM _vk_staging s
                ON CONFLICT (vk_group_id, vk_user_id)
                DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    gender = EXCLUDED.gender,
                    age = EXCLUDED.age,
                    city = EXCLUDED.city,
                    university = EXCLUDED.university,
                    school = EXCLUDED.school,
                    last_recently = EXCLUDED.last_recently,
                    data_timestamp = EXCLUDED.data_timestamp,
                    scraped_at = EXCLUDED.scraped_at
                RETURNING (xmax = 0) AS is_insert
            """))
            for row in result:
                if row[0]:
                    imported += 1
                else:
                    updated += 1

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
        first_line = text_content.split("\n", 1)[0]
        delimiter = "\t" if "\t" in first_line else ","
        csv_reader = list(csv.DictReader(io.StringIO(text_content), delimiter=delimiter))
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
        first_line = text_content.split("\n", 1)[0]
        delimiter = "\t" if "\t" in first_line else ","
        csv_reader = list(csv.DictReader(io.StringIO(text_content), delimiter=delimiter))
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

    # ── Phase 1: Parse all rows ──
    parsed_rows = []
    accounts_seen: Dict[str, dict] = {}  # source_id -> {name, url}

    for idx, row in enumerate(records, start=2):
        try:
            username = str(row.get("username", "")).strip()
            group_name = str(row.get("group_name", "")).strip()
            link = str(row.get("link", "")).strip()
            sex = str(row.get("sex", "")).strip()
            city = str(row.get("city", "")).strip()
            data_timestamp = _parse_date(str(row.get("data_timestamp", "")))

            if not username:
                errors.append(f"Row {idx}: missing username")
                continue

            source_id = group_name if group_name else username
            accounts_seen[source_id] = {"name": group_name, "url": link}

            parsed_rows.append({
                "source_id": source_id,
                "username": username,
                "url": link,
                "sex": sex if sex else None,
                "city": city if city else None,
                "data_timestamp": data_timestamp or scraped_at,
                "scraped_at": scraped_at,
            })
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    if not parsed_rows:
        return ImportResponse(direction_id=direction_id, platform=platform,
                              imported=0, updated=0, errors=errors[:50])

    # ── Phase 2: Batch upsert accounts (once) ──
    acc_id_map: Dict[str, int] = {}

    with engine.begin() as conn:
        # Upsert direction_sources
        ds_values = [{"direction_id": direction_id, "source_type": source_type,
                       "source_identifier": sid} for sid in accounts_seen]
        if ds_values:
            conn.execute(
                text("""
                    INSERT INTO direction_sources (direction_id, source_type, source_identifier)
                    VALUES (:direction_id, :source_type, :source_identifier)
                    ON CONFLICT (direction_id, source_type, source_identifier) DO NOTHING
                """),
                ds_values,
            )

        # Upsert accounts
        acc_params = [
            {"did": direction_id, "u": sid, "l": info["url"],
             "n": info["name"], "s": scraped_at}
            for sid, info in accounts_seen.items()
        ]
        if acc_params:
            conn.execute(
                text(f"""
                    INSERT INTO {table_acc} (direction_id, username, url, name, scraped_at)
                    VALUES (:did, :u, :l, :n, :s)
                    ON CONFLICT (direction_id, username)
                    DO UPDATE SET url = EXCLUDED.url, name = EXCLUDED.name, scraped_at = EXCLUDED.scraped_at
                """),
                acc_params,
            )

        rows = conn.execute(
            text(f"SELECT username, id FROM {table_acc} WHERE direction_id = :did"),
            {"did": direction_id},
        ).fetchall()
        acc_id_map = {r[0]: r[1] for r in rows}

    # ── Phase 3: Batch upsert users in chunks ──
    for chunk_start in range(0, len(parsed_rows), CHUNK_SIZE):
        chunk = parsed_rows[chunk_start:chunk_start + CHUNK_SIZE]
        user_params = []
        for r in chunk:
            acc_id = acc_id_map.get(r["source_id"])
            if not acc_id:
                continue
            user_params.append({
                "acc_id": acc_id,
                "username": r["username"],
                "url": r["url"],
                "sex": r["sex"],
                "city": r["city"],
                "data_timestamp": r["data_timestamp"],
                "scraped_at": r["scraped_at"],
            })

        if not user_params:
            continue

        with engine.begin() as conn:
            conn.execute(text(f"""
                CREATE TEMP TABLE _social_staging (
                    acc_id BIGINT,
                    username TEXT,
                    url TEXT,
                    sex TEXT,
                    city TEXT,
                    data_timestamp TIMESTAMPTZ,
                    scraped_at TIMESTAMPTZ
                ) ON COMMIT DROP
            """))

            conn.execute(
                text("""
                    INSERT INTO _social_staging (acc_id, username, url, sex, city, data_timestamp, scraped_at)
                    VALUES (:acc_id, :username, :url, :sex, :city, :data_timestamp, :scraped_at)
                """),
                user_params,
            )

            result = conn.execute(text(f"""
                INSERT INTO {table_usr} ({fk_field}, username, url, sex, city, data_timestamp, scraped_at)
                SELECT s.acc_id, s.username, s.url, s.sex, s.city, s.data_timestamp, s.scraped_at
                FROM _social_staging s
                ON CONFLICT ({fk_field}, username)
                DO UPDATE SET
                    url = EXCLUDED.url,
                    sex = EXCLUDED.sex,
                    city = EXCLUDED.city,
                    data_timestamp = EXCLUDED.data_timestamp,
                    scraped_at = EXCLUDED.scraped_at
                RETURNING (xmax = 0) AS is_insert
            """))
            for row in result:
                if row[0]:
                    imported += 1
                else:
                    updated += 1

    return ImportResponse(direction_id=direction_id, platform=platform,
                          imported=imported, updated=updated, errors=errors[:50])
