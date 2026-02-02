import io
import os
from datetime import datetime
from typing import List

from fastapi import Depends, FastAPI, HTTPException, Request, status
from minio import Minio
from openpyxl import Workbook
from pydantic import BaseModel
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minio")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minio123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "exports")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
minio_client = Minio(
    MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_ENDPOINT.startswith("https://"),
)

ALL_ROLES = {"user", "admin", "developer"}


class ExportRequest(BaseModel):
    direction_id: int
    format: str
    dataset: str


class ExportResponse(BaseModel):
    object_name: str
    bucket: str


app = FastAPI(title="TASPA Export Service")


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


@app.on_event("startup")
def ensure_bucket() -> None:
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _fetch_dataset(direction_id: int, dataset: str):
    with engine.connect() as conn:
        if dataset == "vk_members":
            rows = conn.execute(
                text(
                    """
                    SELECT m.vk_user_id, m.full_name, m.gender, m.university, m.school
                    FROM vk_members m
                    JOIN vk_groups g ON g.id = m.vk_group_id
                    WHERE g.direction_id = :direction_id
                    ORDER BY m.vk_user_id
                    """
                ),
                {"direction_id": direction_id},
            ).fetchall()
            headers = ["vk_user_id", "full_name", "gender", "university", "school"]
        elif dataset == "instagram_users":
            rows = conn.execute(
                text(
                    """
                    SELECT u.username, u.url, u.bio, u.location
                    FROM instagram_users u
                    JOIN instagram_accounts a ON a.id = u.instagram_account_id
                    WHERE a.direction_id = :direction_id
                    ORDER BY u.username
                    """
                ),
                {"direction_id": direction_id},
            ).fetchall()
            headers = ["username", "url", "bio", "location"]
        elif dataset == "tiktok_users":
            rows = conn.execute(
                text(
                    """
                    SELECT u.username, u.url, u.location, u.followers_count
                    FROM tiktok_users u
                    JOIN tiktok_accounts a ON a.id = u.tiktok_account_id
                    WHERE a.direction_id = :direction_id
                    ORDER BY u.username
                    """
                ),
                {"direction_id": direction_id},
            ).fetchall()
            headers = ["username", "url", "location", "followers_count"]
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown dataset")
    return headers, rows


def _build_xlsx(headers: List[str], rows) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(headers)
    for row in rows:
        sheet.append(list(row))
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _build_pdf(headers: List[str], rows) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(40, 800, "TASPA Export")
    pdf.drawString(40, 785, " | ".join(headers))
    y = 765
    for row in rows[:200]:
        pdf.drawString(40, y, " | ".join([str(v) if v is not None else "" for v in row]))
        y -= 14
        if y < 40:
            pdf.showPage()
            y = 800
    pdf.save()
    return buffer.getvalue()


@app.post("/export", response_model=ExportResponse)
def export_data(
    data: ExportRequest, _: List[str] = Depends(require_any_role)
) -> ExportResponse:
    if data.format not in {"pdf", "xlsx"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported format")
    headers, rows = _fetch_dataset(data.direction_id, data.dataset)
    if data.format == "xlsx":
        blob = _build_xlsx(headers, rows)
        ext = "xlsx"
    else:
        blob = _build_pdf(headers, rows)
        ext = "pdf"

    object_name = f"{data.dataset}/{data.direction_id}/{datetime.utcnow().isoformat()}.{ext}"
    minio_client.put_object(
        MINIO_BUCKET, object_name, io.BytesIO(blob), length=len(blob)
    )
    return ExportResponse(object_name=object_name, bucket=MINIO_BUCKET)
