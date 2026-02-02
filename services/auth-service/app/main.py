import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, text


DATABASE_URL = os.getenv("DATABASE_URL", "")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    roles: List[str]
    is_active: bool


app = FastAPI(title="TASPA Auth Service")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, roles: List[str]) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "roles": roles, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


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
        if role not in user.roles:
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
def login(data: LoginRequest) -> TokenResponse:
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
    token = create_access_token(row[0], roles)
    return TokenResponse(access_token=token, roles=roles)


@app.post("/auth/users", response_model=UserResponse)
def create_user(
    data: CreateUserRequest,
    current_user: Optional[UserResponse] = Depends(get_current_user_optional),
) -> UserResponse:
    with engine.begin() as conn:
        users_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
        if users_count > 0:
            if not current_user or "admin" not in current_user.roles:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
        if data.role not in ["user", "admin", "developer"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

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
    user_id: int, _: UserResponse = Depends(require_role("admin"))
) -> UserResponse:
    with engine.begin() as conn:
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
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        roles = get_user_roles(conn, row[0])
    return UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])


@app.post("/auth/users/{user_id}/unblock", response_model=UserResponse)
def unblock_user(
    user_id: int, _: UserResponse = Depends(require_role("admin"))
) -> UserResponse:
    with engine.begin() as conn:
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
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        roles = get_user_roles(conn, row[0])
    return UserResponse(id=row[0], email=row[1], roles=roles, is_active=row[2])


@app.get("/auth/me", response_model=UserResponse)
def me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return current_user
