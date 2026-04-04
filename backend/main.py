import os
from dotenv import load_dotenv
load_dotenv()
from groq import Groq
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Session

# ── 設定 ────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "betsports-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:edcwsxaz7@localhost:5432/betsports")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()
token_blacklist: set[str] = set()

# ── 資料庫模型 ────────────────────────────────────────
engine = create_engine(DATABASE_URL)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    display_name    = Column(String, nullable=False)
    balance         = Column(Integer, default=50000, nullable=False)
    total_deposited = Column(Integer, default=0, nullable=False)

class BetRecord(Base):
    __tablename__ = "placed_bets"
    id              = Column(String, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    match_id        = Column(String)
    match_name      = Column(String)
    selection       = Column(String)
    selection_label = Column(String)
    odds            = Column(Float)
    stake           = Column(Integer)
    placed_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status          = Column(String, default="pending")
    potential_win   = Column(Integer)
    is_parlay       = Column(Boolean, default=False)
    parlay_legs     = Column(JSON, nullable=True)
    combined_odds   = Column(Float, nullable=True)

Base.metadata.create_all(bind=engine)

def get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()

# ── Pydantic Schema ──────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ParlayLegSchema(BaseModel):
    matchName: str
    selectionLabel: str
    odds: float

class PlaceBetItem(BaseModel):
    id: str
    matchId: str
    matchName: str
    selection: str
    selectionLabel: str
    odds: float
    stake: int
    potentialWin: int
    isParlay: bool = False
    parlayLegs: Optional[list[ParlayLegSchema]] = None
    combinedOdds: Optional[float] = None

class PlaceBetsRequest(BaseModel):
    bets: list[PlaceBetItem]
    totalStake: int

class BetRecordResponse(BaseModel):
    id: str
    matchId: str
    matchName: str
    selection: str
    selectionLabel: str
    odds: float
    stake: int
    placedAt: str
    status: str
    potentialWin: int
    isParlay: bool
    parlayLegs: Optional[list] = None
    combinedOdds: Optional[float] = None

class SettleBetRequest(BaseModel):
    result: str  # 'won' or 'lost'

class TransactionRequest(BaseModel):
    amount: int

class ChatMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    text: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    lang: str = 'zh-TW'

# ── 工具函數 ─────────────────────────────────────────
def create_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    token = credentials.credentials
    if token in token_blacklist:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 已失效，請重新登入")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(User).filter(User.username == payload["username"]).first()
        if not user:
            raise JWTError()
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token 無效或已過期")

def bet_to_response(bet: BetRecord) -> BetRecordResponse:
    return BetRecordResponse(
        id=bet.id,
        matchId=bet.match_id,
        matchName=bet.match_name,
        selection=bet.selection,
        selectionLabel=bet.selection_label,
        odds=bet.odds,
        stake=bet.stake,
        placedAt=bet.placed_at.isoformat(),
        status=bet.status,
        potentialWin=bet.potential_win,
        isParlay=bet.is_parlay,
        parlayLegs=bet.parlay_legs,
        combinedOdds=bet.combined_odds,
    )

# ── App ──────────────────────────────────────────────
app = FastAPI(title="BetSports API")

_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth 路由 ─────────────────────────────────────────
@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="帳號已存在")
    user = User(
        username=body.username,
        hashed_password=pwd_context.hash(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not pwd_context.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")
    return {"access_token": create_token(user.id, user.username)}

@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token_blacklist.add(credentials.credentials)

@app.get("/auth/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/auth/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not pwd_context.verify(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="目前密碼錯誤")
    db.query(User).filter(User.id == current_user.id).update(
        {"hashed_password": pwd_context.hash(body.new_password)}
    )
    db.commit()

# ── 餘額路由 ──────────────────────────────────────────
@app.get("/user/balance")
def get_balance(current_user: User = Depends(get_current_user)):
    return {"balance": current_user.balance, "total_deposited": current_user.total_deposited}

# ── 投注路由 ──────────────────────────────────────────
@app.post("/bets/place", response_model=list[BetRecordResponse])
def place_bets(
    body: PlaceBetsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if user.balance < body.totalStake:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="餘額不足")

    records = []
    for bet in body.bets:
        record = BetRecord(
            id=bet.id,
            user_id=user.id,
            match_id=bet.matchId,
            match_name=bet.matchName,
            selection=bet.selection,
            selection_label=bet.selectionLabel,
            odds=bet.odds,
            stake=bet.stake,
            potential_win=bet.potentialWin,
            is_parlay=bet.isParlay,
            parlay_legs=[leg.model_dump() for leg in bet.parlayLegs] if bet.parlayLegs else None,
            combined_odds=bet.combinedOdds,
        )
        db.add(record)
        records.append(record)

    user.balance -= body.totalStake
    db.commit()
    for r in records:
        db.refresh(r)

    return [bet_to_response(r) for r in records]

@app.get("/bets", response_model=list[BetRecordResponse])
def get_bets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bets = db.query(BetRecord).filter(BetRecord.user_id == current_user.id).order_by(BetRecord.placed_at.desc()).all()
    return [bet_to_response(b) for b in bets]

@app.post("/bets/{bet_id}/settle", status_code=status.HTTP_204_NO_CONTENT)
def settle_bet(
    bet_id: str,
    body: SettleBetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bet = db.query(BetRecord).filter(BetRecord.id == bet_id, BetRecord.user_id == current_user.id).first()
    if not bet or bet.status != "pending":
        return

    bet.status = body.result
    if body.result == "won":
        user = db.query(User).filter(User.id == current_user.id).first()
        user.balance += bet.potential_win
    db.commit()

# ── 出入金路由 ────────────────────────────────────────
CHAT_SYSTEM = {
    'zh-TW': """你是 BetSports 的專業客服助理。BetSports 是一個合法的線上運動投注平台，提供足球、籃球、棒球、網球、電競等多項賽事的即時投注服務。

你的任務是親切、專業地回答顧客的問題，包括：
- 入金與出金操作方式（最低入金 NT$1,000，出金1-3工作天）
- 投注規則（單場投注、串關投注）
- 賠率計算方式
- 帳號相關問題（註冊、登入、修改密碼）
- 賽事與遊戲規則

回覆請保持簡潔（100字以內），使用繁體中文，語氣友善專業。若問題超出範圍，建議顧客透過線上客服聯繫。""",
    'en': """You are a professional customer support assistant for BetSports, a licensed online sports betting platform offering live betting on football, basketball, baseball, tennis, and esports.

Your role is to assist customers with questions about:
- Deposit and withdrawal (min deposit NT$1,000, withdrawals in 1-3 business days)
- Betting rules (single bets, parlay bets)
- How odds work
- Account issues (registration, login, password changes)
- Events and game rules

Keep replies concise (under 80 words), friendly and professional. For issues beyond your scope, direct customers to live support.""",
    'ja': """あなたは BetSports のプロフェッショナルなカスタマーサポートアシスタントです。BetSports はサッカー、バスケットボール、野球、テニス、eスポーツなどのリアルタイムベッティングサービスを提供する公認オンラインスポーツベッティングプラットフォームです。

以下の質問にお答えします：
- 入金・出金の方法（最低入金 NT$1,000、出金は1〜3営業日）
- ベットルール（シングル・パーレー）
- オッズの計算方法
- アカウント関連（登録・ログイン・パスワード変更）
- イベントとゲームルール

返答は簡潔に（80文字以内）、丁寧かつプロフェッショナルなトーンで日本語でお答えください。""",
}

@app.post("/chat")
def chat(body: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    system = CHAT_SYSTEM.get(body.lang, CHAT_SYSTEM['zh-TW'])
    client = Groq(api_key=api_key)

    groq_messages = [{"role": "system", "content": system}] + [
        {"role": m.role if m.role == "user" else "assistant", "content": m.text}
        for m in body.messages
        if m.role in ("user", "assistant")
    ]

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=512,
            messages=groq_messages,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/deposit")
def deposit(
    body: TransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="金額必須大於 0")
    if body.amount > 1000000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="單次入金上限為 NT$ 1,000,000")
    user = db.query(User).filter(User.id == current_user.id).first()
    user.balance += body.amount
    user.total_deposited += body.amount
    db.commit()
    return {"balance": user.balance, "total_deposited": user.total_deposited}

@app.post("/user/withdraw")
def withdraw(
    body: TransactionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="金額必須大於 0")
    user = db.query(User).filter(User.id == current_user.id).first()
    if user.balance < body.amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="餘額不足")
    user.balance -= body.amount
    db.commit()
    return {"balance": user.balance}
