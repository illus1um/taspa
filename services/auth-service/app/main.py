import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ROLE_LEVELS = {"user": 1, "admin": 2, "developer": 3}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    roles: List[str]


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    role: str


class ResetPasswordRequest(BaseModel):
    password: str


class UpdateRoleRequest(BaseModel):
    role: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    roles: List[str]
    is_active: bool


app = FastAPI(title="TASPA Auth Service")
app.router.redirect_slashes = False


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, roles: List[str]) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "roles": roles, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _issue_refresh_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(48)
    hashed = _hash_refresh_token(raw)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return raw, hashed, expires_at


def get_user_roles(conn, user_id: int) -> List[str]:
    rows = conn.execute(
        text(
            """
            SELECT r.name
            FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = :user_id
            """
        ),
        {"user_id": user_id},
    ).fetchall()
    return [r[0] for r in rows]


def _get_role_level(roles: List[str]) -> int:
    if not roles:
        return 0
    return max(ROLE_LEVELS.get(role, 0) for role in roles)


def has_role(roles: List[str], required: str) -> bool:
    return _get_role_level(roles) >= ROLE_LEVELS.get(required, 0)


def get_current_user(request: Request) -> UserResponse:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = auth_header.replace("Bearer ", "", 1)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", "0"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, email, is_active
                FROM users
                WHERE id = :id
                """
            ),
            {"id": user_id},
        ).fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        roles = get_user_roles(conn, user_id)
        return UserResponse(id=row[0], email=row[1], is_active=row[2], roles=roles)


def get_current_user_optional(request: Request) -> Optional[UserResponse]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header:
        return None
    return get_current_user(request)


def require_role(role: str):
    def _require(user: UserResponse = Depends(get_current_user)) -> UserResponse:
        if not has_role(user.roles, role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return _require


@app.on_event("startup")
def seed_roles() -> None:
    with engine.begin() as conn:
        for role in ["user", "admin", "developer"]:
            conn.execute(
                text("INSERT INTO roles (name) VALUES (:name) ON CONFLICT DO NOTHING"),
                {"name": role},
            )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, response: Response) -> TokenResponse:
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, password_hash, is_active
                FROM users
                WHERE email = :email
                """
            ),
            {"email": data.email},
        ).fetchone()
        if not row or not row[2]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        if not verify_password(data.password, row[1]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        roles = get_user_roles(conn, row[0])
        refresh_raw, refresh_hash, refresh_expires = _issue_refresh_token()
        conn.execute(
            text(
                """
                UPDATE users
                SET refresh_token_hash = :hash,
                    refresh_token_expires_at = :expires
                WHERE id = :id
                """
            ),
            {"hash": refresh_hash, "expires": refresh_expires, "id": row[0]},
        )
    token = create_access_token(row[0], roles)
    response.set_cookie(
        key="refresh_token",
        value=refresh_raw,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )
    return TokenResponse(access_token=token, roles=roles)


@app.post("/auth/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response) -> TokenResponse:
    raw = request.cookies.get("refresh_token")
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")
    hashed = _hash_refresh_token(raw)
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, email, is_active, refresh_token_expires_at
                FROM users
                WHERE refresh_token_hash = :hash
                """
            ),
            {"hash": hashed},
        ).fetchone()
        if not row or not row[2]:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        if row[3] is None or row[3] < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
        roles = get_user_roles(conn, row[0])
        refresh_raw, refresh_hash, refresh_expires = _issue_refresh_token()
        conn.execute(
            text(
                """
                UPDATE users
                SET refresh_token_hash = :hash,
                    refresh_token_expires_at = :expires
                WHERE id = :id
                """
            ),
            {"hash": refresh_hash, "expires": refresh_expires, "id": row[0]},
        )
    token = create_access_token(row[0], roles)
    response.set_cookie(
        key="refresh_token",
        value=refresh_raw,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )
    return TokenResponse(access_token=token, roles=roles)


@app.post("/auth/users", response_model=UserResponse)
def create_user(
    data: CreateUserRequest,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
) -> UserResponse:
    with engine.begin() as conn:
        users_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
        if users_count > 0:
            if not current_user:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
            if not has_role(current_user.roles, "admin"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
            if not has_role(current_user.roles, "developer") and data.role != "user":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can create only users",
                )
        if data.role not in ["user", "admin", "developer"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        if users_count == 0 and data.role not in ["admin", "developer"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="First user must be admin or developer",
            )

        role_row = conn.execute(
            text("SELECT id FROM roles WHERE name = :name"),
            {"name": data.role},
        ).fetchone()
        if not role_row:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Role missing")

        existing = conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": data.email},
        ).fetchone()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User exists")

        result = conn.execute(
            text(
                """
                INSERT INTO users (email, password_hash)
                VALUES (:email, :password_hash)
                RETURNING id
                """
            ),
            {"email": data.email, "password_hash": hash_password(data.password)},
        )
        user_id = result.fetchone()[0]
        conn.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES (:user_id, :role_id)
                """
            ),
            {"user_id": user_id, "role_id": role_row[0]},
        )

        return UserResponse(id=user_id, email=data.email, roles=[data.role], is_active=True)


@app.post("/auth/logout")
def logout(current_user: UserResponse = Depends(get_current_user)) -> Response:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE users
                SET refresh_token_hash = NULL,
                    refresh_token_expires_at = NULL
                WHERE id = :id
                """
            ),
            {"id": current_user.id},
        )
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie("refresh_token", path="/")
    return response


@app.get("/auth/users", response_model=List[UserResponse])
def list_users(_: UserResponse = Depends(require_role("admin"))) -> List[UserResponse]:
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, email, is_active
                FROM users
                ORDER BY id
                """
            )
        ).fetchall()
        users = []
        for row in rows:
            roles = get_user_roles(conn, row[0])
            users.append(
                UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])
            )
    return users


@app.post("/auth/users/{user_id}/block", response_model=UserResponse)
def block_user(
    user_id: int, current_user: UserResponse = Depends(require_role("admin"))
) -> UserResponse:
    with engine.begin() as conn:
        target_row = conn.execute(
            text("SELECT id, email, is_active FROM users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        if not target_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        target_roles = get_user_roles(conn, target_row[0])

        if not has_role(current_user.roles, "developer"):
            if has_role(target_roles, "admin") or has_role(target_roles, "developer"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can manage only users",
                )

        row = conn.execute(
            text(
                """
                UPDATE users
                SET is_active = FALSE
                WHERE id = :id
                RETURNING id, email, is_active
                """
            ),
            {"id": user_id},
        ).fetchone()
        roles = get_user_roles(conn, row[0])
    return UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])


@app.post("/auth/users/{user_id}/unblock", response_model=UserResponse)
def unblock_user(
    user_id: int, current_user: UserResponse = Depends(require_role("admin"))
) -> UserResponse:
    with engine.begin() as conn:
        target_row = conn.execute(
            text("SELECT id, email, is_active FROM users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        if not target_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        target_roles = get_user_roles(conn, target_row[0])

        if not has_role(current_user.roles, "developer"):
            if has_role(target_roles, "admin") or has_role(target_roles, "developer"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can manage only users",
                )

        row = conn.execute(
            text(
                """
                UPDATE users
                SET is_active = TRUE
                WHERE id = :id
                RETURNING id, email, is_active
                """
            ),
            {"id": user_id},
        ).fetchone()
        roles = get_user_roles(conn, row[0])
    return UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])


@app.put("/auth/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    data: UpdateRoleRequest,
    current_user: UserResponse = Depends(require_role("admin")),
) -> UserResponse:
    if data.role not in ROLE_LEVELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
    if not has_role(current_user.roles, "developer") and data.role != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin can assign only user role",
        )
    with engine.begin() as conn:
        target_row = conn.execute(
            text("SELECT id FROM users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        if not target_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        target_roles = get_user_roles(conn, user_id)
        if not has_role(current_user.roles, "developer"):
            if has_role(target_roles, "admin") or has_role(target_roles, "developer"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can manage only users",
                )

        role_row = conn.execute(
            text("SELECT id FROM roles WHERE name = :name"),
            {"name": data.role},
        ).fetchone()
        if not role_row:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Role missing")

        conn.execute(
            text("DELETE FROM user_roles WHERE user_id = :user_id"),
            {"user_id": user_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO user_roles (user_id, role_id)
                VALUES (:user_id, :role_id)
                """
            ),
            {"user_id": user_id, "role_id": role_row[0]},
        )

        row = conn.execute(
            text("SELECT id, email, is_active FROM users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        roles = get_user_roles(conn, user_id)
    return UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])


@app.post("/auth/users/{user_id}/reset-password", response_model=UserResponse)
def reset_password(
    user_id: int,
    data: ResetPasswordRequest,
    current_user: UserResponse = Depends(require_role("admin")),
) -> UserResponse:
    if len(data.password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password too short")
    with engine.begin() as conn:
        target_row = conn.execute(
            text("SELECT id FROM users WHERE id = :id"),
            {"id": user_id},
        ).fetchone()
        if not target_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        target_roles = get_user_roles(conn, user_id)
        if not has_role(current_user.roles, "developer"):
            if has_role(target_roles, "admin") or has_role(target_roles, "developer"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin can manage only users",
                )

        row = conn.execute(
            text(
                """
                UPDATE users
                SET password_hash = :password_hash
                WHERE id = :id
                RETURNING id, email, is_active
                """
            ),
            {"id": user_id, "password_hash": hash_password(data.password)},
        ).fetchone()
        roles = get_user_roles(conn, row[0])
    return UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return current_user
