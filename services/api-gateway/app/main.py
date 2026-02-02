import os
from typing import Dict, Iterable, Tuple

import httpx
from fastapi import FastAPI, HTTPException, Request, Response, status
from jose import JWTError, jwt
from pydantic import BaseModel


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

SERVICE_MAP: Dict[str, str] = {
    "auth": os.getenv("AUTH_SERVICE_URL", ""),
    "directions": os.getenv("DIRECTION_SERVICE_URL", ""),
    "analytics": os.getenv("ANALYTICS_SERVICE_URL", ""),
    "export": os.getenv("EXPORT_SERVICE_URL", ""),
}

SCRAPING_SERVICE_URL = os.getenv("SCRAPING_SERVICE_URL", "")

HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


app = FastAPI(title="TASPA API Gateway")


class ScrapeStartRequest(BaseModel):
    service_name: str
    direction_id: int


def _filter_headers(headers: Iterable[Tuple[str, str]]) -> Dict[str, str]:
    filtered: Dict[str, str] = {}
    for k, v in headers:
        key = k.lower()
        if key in HOP_BY_HOP_HEADERS:
            continue
        filtered[k] = v
    return filtered


def _require_jwt(request: Request) -> Dict[str, str]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = auth_header.replace("Bearer ", "", 1)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"user_id": payload.get("sub", ""), "roles": ",".join(payload.get("roles", []))}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/scrape/start")
async def scrape_start(data: ScrapeStartRequest, request: Request) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/jobs"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=data.model_dump(), headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.get("/scrape/jobs")
async def scrape_jobs(request: Request) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/jobs"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.get("/scrape/jobs/{job_id}")
async def scrape_job_status(job_id: int, request: Request) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/jobs/{job_id}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.post("/scrape/jobs/{job_id}/stop")
async def scrape_job_stop(job_id: int, request: Request) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/jobs/{job_id}/stop"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.get("/scrape/config")
async def scrape_config(request: Request) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/config"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.get("/scrape/config/{service_name}")
async def scrape_config_service(service_name: str, request: Request) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/config/{service_name}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.put("/scrape/config/{service_name}")
async def scrape_config_update(
    service_name: str, request: Request
) -> Response:
    if not SCRAPING_SERVICE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scraping service not configured",
        )
    user_meta = _require_jwt(request)
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    headers["X-User-Id"] = user_meta["user_id"]
    headers["X-Roles"] = user_meta["roles"]
    body = await request.body()

    url = f"{SCRAPING_SERVICE_URL.rstrip('/')}/scrape/config/{service_name}"
    async with httpx.AsyncClient() as client:
        resp = await client.put(url, content=body, headers=headers)
    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)


@app.api_route("/{service}/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(service: str, path: str, request: Request) -> Response:
    base_url = SERVICE_MAP.get(service)
    if not base_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown service")

    if service != "auth":
        user_meta = _require_jwt(request)
    else:
        user_meta = {}

    full_path = service if not path else f"{service}/{path}"
    url = f"{base_url.rstrip('/')}/{full_path}"
    headers = _filter_headers(request.headers.items())
    headers.pop("host", None)
    if user_meta:
        headers["X-User-Id"] = user_meta["user_id"]
        headers["X-Roles"] = user_meta["roles"]

    body = await request.body()
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            request.method,
            url,
            params=request.query_params,
            content=body,
            headers=headers,
        )

    response_headers = _filter_headers(resp.headers.items())
    return Response(content=resp.content, status_code=resp.status_code, headers=response_headers)
