from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

# ── 設定 ────────────────────────────────────────────
SECRET_KEY = "betsports-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 小時

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

# token 黑名單（登出後加入，之後該 token 無法再使用）
token_blacklist: set[str] = set()

# ── 假資料庫（密碼用 bcrypt hash 儲存）───────────────
USERS_DB = [
    {
        "id": 1,
        "username": "demo",
        "hashed_password": pwd_context.hash("123456"),
        "display_name": "Demo User",
    },
    {
        "id": 2,
        "username": "test",
        "hashed_password": pwd_context.hash("password"),
        "display_name": "Test Player",
    },
]

# ── Schema ───────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str

# ── 工具函數 ─────────────────────────────────────────
def find_user(username: str):
    return next((u for u in USERS_DB if u["username"] == username), None)

def create_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials
    if token in token_blacklist:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 已失效，請重新登入")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = find_user(payload["username"])
        if not user:
            raise JWTError()
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 無效或已過期")

# ── App ──────────────────────────────────────────────
app = FastAPI(title="BetSports API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 路由 ─────────────────────────────────────────────
@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = find_user(body.username)
    if not user or not pwd_context.verify(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")
    return {"access_token": create_token(user["id"], user["username"])}

@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token_blacklist.add(credentials.credentials)

@app.get("/auth/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "display_name": current_user["display_name"],
    }
