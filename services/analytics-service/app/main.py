import os
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

ALL_ROLES = {"user", "admin", "developer"}


class VkSummaryResponse(BaseModel):
    direction_id: int
    total_members: int
    group_count: int


class VkGenderItem(BaseModel):
    gender: str
    count: int


class VkUniItem(BaseModel):
    university: str
    count: int


class VkSchoolItem(BaseModel):
    school: str
    count: int


class VkTimelineItem(BaseModel):
    day: str
    count: int


class VkMemberItem(BaseModel):
    vk_user_id: str
    full_name: Optional[str]
    gender: Optional[str]
    university: Optional[str]
    school: Optional[str]


class VkMemberSearchResponse(BaseModel):
    items: List[VkMemberItem]


class InstagramAccountItem(BaseModel):
    username: str
    url: Optional[str]
    location: Optional[str]


class InstagramUsersResponse(BaseModel):
    items: List[InstagramAccountItem]


class TikTokAccountItem(BaseModel):
    username: str
    url: Optional[str]
    location: Optional[str]
    followers_count: Optional[int]


class TikTokUsersResponse(BaseModel):
    items: List[TikTokAccountItem]


class DirectionGroupsItem(BaseModel):
    name: Optional[str]
    members_count: Optional[int]


class DirectionGroupsResponse(BaseModel):
    items: List[DirectionGroupsItem]


app = FastAPI(title="TASPA Analytics Service")
router = APIRouter(prefix="/analytics")


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


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/vk/summary/{direction_id}", response_model=VkSummaryResponse)
def vk_summary(direction_id: int, _: List[str] = Depends(require_any_role)) -> VkSummaryResponse:
    with engine.connect() as conn:
        group_row = conn.execute(
            text(
                """
                SELECT COUNT(*) AS group_count
                FROM vk_groups
                WHERE direction_id = :direction_id
                """
            ),
            {"direction_id": direction_id},
        ).fetchone()
        members_row = conn.execute(
            text(
                """
                SELECT COUNT(*) AS total_members
                FROM vk_members m
                JOIN vk_groups g ON g.id = m.vk_group_id
                WHERE g.direction_id = :direction_id
                """
            ),
            {"direction_id": direction_id},
        ).fetchone()
    return VkSummaryResponse(
        direction_id=direction_id,
        total_members=int(members_row[0] or 0),
        group_count=int(group_row[0] or 0),
    )


@router.get("/vk/gender/{direction_id}", response_model=List[VkGenderItem])
def vk_gender(direction_id: int, _: List[str] = Depends(require_any_role)) -> List[VkGenderItem]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT COALESCE(gender, 'unknown') AS gender, COUNT(*) AS count
                FROM vk_members m
                JOIN vk_groups g ON g.id = m.vk_group_id
                WHERE g.direction_id = :direction_id
                GROUP BY COALESCE(gender, 'unknown')
                ORDER BY count DESC
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    return [VkGenderItem(gender=row[0], count=row[1]) for row in rows]


@router.get("/vk/universities/{direction_id}", response_model=List[VkUniItem])
def vk_universities(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> List[VkUniItem]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT COALESCE(university, 'unknown') AS university, COUNT(*) AS count
                FROM vk_members m
                JOIN vk_groups g ON g.id = m.vk_group_id
                WHERE g.direction_id = :direction_id
                GROUP BY COALESCE(university, 'unknown')
                ORDER BY count DESC
                LIMIT 50
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    return [VkUniItem(university=row[0], count=row[1]) for row in rows]


@router.get("/vk/schools/{direction_id}", response_model=List[VkSchoolItem])
def vk_schools(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> List[VkSchoolItem]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT COALESCE(school, 'unknown') AS school, COUNT(*) AS count
                FROM vk_members m
                JOIN vk_groups g ON g.id = m.vk_group_id
                WHERE g.direction_id = :direction_id
                GROUP BY COALESCE(school, 'unknown')
                ORDER BY count DESC
                LIMIT 50
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    return [VkSchoolItem(school=row[0], count=row[1]) for row in rows]


@router.get("/vk/timeline/{direction_id}", response_model=List[VkTimelineItem])
def vk_timeline(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> List[VkTimelineItem]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT to_char(m.scraped_at::date, 'YYYY-MM-DD') AS day, COUNT(*) AS count
                FROM vk_members m
                JOIN vk_groups g ON g.id = m.vk_group_id
                WHERE g.direction_id = :direction_id
                GROUP BY m.scraped_at::date
                ORDER BY m.scraped_at::date ASC
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    return [VkTimelineItem(day=row[0], count=row[1]) for row in rows]


@router.get("/vk/search", response_model=VkMemberSearchResponse)
def vk_search(
    direction_id: int,
    q: str,
    limit: int = 50,
    _: List[str] = Depends(require_any_role),
) -> VkMemberSearchResponse:
    search = f"%{q.lower()}%"
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT m.vk_user_id, m.full_name, m.gender, m.university, m.school
                FROM vk_members m
                JOIN vk_groups g ON g.id = m.vk_group_id
                WHERE g.direction_id = :direction_id
                  AND (
                    LOWER(m.vk_user_id) LIKE :search
                    OR LOWER(m.full_name) LIKE :search
                  )
                ORDER BY m.vk_user_id
                LIMIT :limit
                """
            ),
            {"direction_id": direction_id, "search": search, "limit": limit},
        ).fetchall()
    items = [
        VkMemberItem(
            vk_user_id=row[0],
            full_name=row[1],
            gender=row[2],
            university=row[3],
            school=row[4],
        )
        for row in rows
    ]
    return VkMemberSearchResponse(items=items)


@router.get("/vk/groups/{direction_id}", response_model=DirectionGroupsResponse)
def vk_groups(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> DirectionGroupsResponse:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT name, members_count
                FROM vk_groups
                WHERE direction_id = :direction_id
                ORDER BY members_count DESC NULLS LAST
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    items = [DirectionGroupsItem(name=row[0], members_count=row[1]) for row in rows]
    return DirectionGroupsResponse(items=items)


@router.get("/instagram/users/{direction_id}", response_model=InstagramUsersResponse)
def instagram_users(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> InstagramUsersResponse:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT username, url, location
                FROM instagram_users u
                JOIN instagram_accounts a ON a.id = u.instagram_account_id
                WHERE a.direction_id = :direction_id
                ORDER BY username
                LIMIT 500
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    items = [InstagramAccountItem(username=row[0], url=row[1], location=row[2]) for row in rows]
    return InstagramUsersResponse(items=items)


@router.get("/instagram/accounts/{direction_id}", response_model=InstagramUsersResponse)
def instagram_accounts(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> InstagramUsersResponse:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT username, url, location
                FROM instagram_accounts
                WHERE direction_id = :direction_id
                ORDER BY username
                LIMIT 500
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    items = [InstagramAccountItem(username=row[0], url=row[1], location=row[2]) for row in rows]
    return InstagramUsersResponse(items=items)


@router.get("/tiktok/users/{direction_id}", response_model=TikTokUsersResponse)
def tiktok_users(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> TikTokUsersResponse:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT username, url, location, followers_count
                FROM tiktok_users u
                JOIN tiktok_accounts a ON a.id = u.tiktok_account_id
                WHERE a.direction_id = :direction_id
                ORDER BY username
                LIMIT 500
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    items = [
        TikTokAccountItem(username=row[0], url=row[1], location=row[2], followers_count=row[3])
        for row in rows
    ]
    return TikTokUsersResponse(items=items)


@router.get("/tiktok/accounts/{direction_id}", response_model=TikTokUsersResponse)
def tiktok_accounts(
    direction_id: int, _: List[str] = Depends(require_any_role)
) -> TikTokUsersResponse:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT username, url, location, followers_count
                FROM tiktok_accounts
                WHERE direction_id = :direction_id
                ORDER BY followers_count DESC NULLS LAST
                LIMIT 500
                """
            ),
            {"direction_id": direction_id},
        ).fetchall()
    items = [
        TikTokAccountItem(username=row[0], url=row[1], location=row[2], followers_count=row[3])
        for row in rows
    ]
    return TikTokUsersResponse(items=items)


app.include_router(router)
