import asyncio
import datetime
import hashlib
import os
import random
import uuid

from dotenv import load_dotenv
from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo import MongoClient

from auth import create_token, decode_token, hash_password, verify_password
from framework.mat_engine import (
    check_answer,
    check_open_ended_response,
    generate_analysis,
    generate_context_suggestions,
    generate_discussion,
    generate_final_summary,
    generate_mastery_question,
    generate_ncl,
    generate_ncl_review,
    generate_provocation,
    generate_provocation_feedback,
    generate_rac_suggestions,
    generate_rac_template,
    generate_reflection,
    generate_subtopics,
    get_rac_section_feedback,
    guide_project,
)
from models import AnswerInput, LoginRequest, ProjectMessage, RegisterRequest, UnitInput

# â”€â”€ Environment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
load_dotenv()

# â”€â”€ MongoDB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")

# Use TLS only for Atlas (cloud) connections; local MongoDB does not need it
use_tls = "mongodb+srv" in MONGODB_URI or "mongodb.net" in MONGODB_URI

if use_tls:
    mongo_client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=5000,
        maxPoolSize=10,
        minPoolSize=1,
        tls=True,
        tlsAllowInvalidCertificates=True,
        tlsAllowInvalidHostnames=True,
    )
else:
    mongo_client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        socketTimeoutMS=5000,
        maxPoolSize=10,
        minPoolSize=1,
    )
db = mongo_client["shikha_framework"]
cache_collection    = db["unit_cache"]
sessions_collection = db["sessions"]
students_collection = db["students"]
progress_collection = db["progress"]
users_collection    = db["users"]

# â”€â”€ FastAPI app â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app = FastAPI(
    title="Shikha Adaptive Learning Framework",
    description="AI-powered unit generation using MAT framework",
    version="2.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://shikha-adaptive-system.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# â”€â”€ In-memory session store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
sessions = {}

# â”€â”€ Per-session generated-content cache (avoids repeat Claude calls) â”€â”€
_rac_cache:          dict = {}   # session_id â†’ rac suggestions result
_context_cache:      dict = {}   # "grade|subject|chapter" â†’ context list


# â”€â”€ Explicit OPTIONS preflight handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin"     : request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods"    : "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers"    : "*",
            "Access-Control-Allow-Credentials": "true",
        },
    )


# â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def _unit_input_dict(unit_input) -> dict:
    """Serialize a UnitInput Pydantic model to a plain dict (supports v1 and v2)."""
    try:
        return unit_input.model_dump()   # Pydantic v2
    except AttributeError:
        return unit_input.dict()         # Pydantic v1


def make_cache_key(unit_input: UnitInput) -> str:
    raw = (
        f"{unit_input.grade}_{unit_input.subject}"
        f"_{unit_input.chapter}_{unit_input.context}"
    )
    return hashlib.md5(raw.lower().encode()).hexdigest()


# â”€â”€ Session persistence helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def save_session_to_db(session_id: str, session_data: dict):
    """Persist session to MongoDB so it survives server restarts."""
    try:
        unit_input = session_data["unit_input"]
        ui_dict = (
            _unit_input_dict(unit_input)
            if hasattr(unit_input, "model_dump") or hasattr(unit_input, "dict")
            else unit_input
        )
        sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": {
                "session_id"       : session_id,
                "unit_input"       : ui_dict,
                "performance"      : session_data.get("performance", {}),
                "generated_content": session_data.get("generated_content", {}),
                "mastery_questions": session_data.get("mastery_questions", {}),
                "updated_at"       : datetime.datetime.utcnow(),
            }},
            upsert=True,
        )
    except Exception as e:
        print(f"Failed to save session {session_id}: {e}")


def restore_session_from_db(session_id: str):
    """Restore session from MongoDB into in-memory dict. Returns session or None."""
    try:
        record = sessions_collection.find_one({"session_id": session_id})
        if not record:
            return None
        ui = record["unit_input"]
        session = {
            "unit_input"       : UnitInput(**ui),
            "performance"      : record.get("performance", {}),
            "generated_content": record.get("generated_content", {}),
            "mastery_questions": record.get("mastery_questions", {}),
        }
        sessions[session_id] = session
        print(f"Restored session {session_id} from MongoDB")
        return session
    except Exception as e:
        print(f"Failed to restore session {session_id}: {e}")
        return None


def get_session(session_id: str):
    """Return session from memory, restoring from MongoDB if needed. Returns None if not found."""
    if session_id in sessions:
        return sessions[session_id]
    return restore_session_from_db(session_id)


def _get_session(session_id: str) -> dict:
    """Get session or raise 404."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# â”€â”€ Auth helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    try:
        user = users_collection.find_one(
            {"user_id": payload.get("user_id")},
            {"_id": 0, "password": 0},
        )
        if user:
            return user
    except Exception as e:
        print(f"[WARN] DB error in get_current_user: {e}")
    # DB unavailable â€” reconstruct minimal user from token
    return {
        "user_id": payload.get("user_id"),
        "email"  : payload.get("email"),
        "role"   : payload.get("role"),
        "name"   : payload.get("email", "User").split("@")[0],
    }


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Health check
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.get("/")
def health():
    return {
        "system": "Shikha Adaptive Learning Framework",
        "version": "2.2",
        "status": "running",
    }


@app.get("/ping")
def ping():
    return {"status": "alive", "timestamp": datetime.datetime.now().isoformat()}


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Auth endpoints
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.post("/auth/register")
async def register(request: RegisterRequest):
    try:
        existing = users_collection.find_one({"email": request.email.lower()})
    except Exception as e:
        print(f"[WARN] MongoDB unavailable during register lookup: {e}")
        existing = None

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    try:
        user = {
            "user_id"   : user_id,
            "name"      : request.name.strip(),
            "email"     : request.email.lower().strip(),
            "password"  : hash_password(request.password),
            "role"      : request.role,
            "created_at": datetime.datetime.utcnow(),
        }
        users_collection.insert_one(user)
    except Exception as e:
        print(f"[WARN] Could not save user to DB: {e}")
        # Continue â€” return token so the session works even without persistence

    token = create_token({
        "user_id": user_id,
        "email"  : request.email.lower(),
        "role"   : request.role,
    })
    return {
        "token"  : token,
        "user_id": user_id,
        "name"   : request.name.strip(),
        "email"  : request.email.lower(),
        "role"   : request.role,
    }


@app.post("/auth/login")
async def login(request: LoginRequest):
    try:
        user = users_collection.find_one({"email": request.email.lower()})
    except Exception as e:
        print(f"[WARN] MongoDB unavailable for login: {e}")
        raise HTTPException(
            status_code=503,
            detail="Database temporarily unavailable. Please try again.",
        )
    if not user or not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token({
        "user_id": user["user_id"],
        "email"  : user["email"],
        "role"   : user["role"],
    })
    return {
        "token"  : token,
        "user_id": user["user_id"],
        "name"   : user["name"],
        "email"  : user["email"],
        "role"   : user["role"],
    }


@app.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return current_user


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Unit creation
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.post("/unit/create")
async def create_unit(
    unit_input: UnitInput,
    current_user=Depends(get_current_user),
):
    session_id   = str(uuid.uuid4())
    session_data = {
        "unit_input"         : unit_input,
        "performance"        : {},
        "current_template"   : "provocation",
        "completed_templates": [],
        "generated_content"  : {},
        "teacher_id"         : current_user["user_id"] if current_user else None,
    }
    sessions[session_id] = session_data
    save_session_to_db(session_id, session_data)
    return {"session_id": session_id, "message": "Unit created successfully"}

@app.get("/session/{session_id}")
async def get_session_data(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    unit_input = session.get("unit_input")
    if hasattr(unit_input, "model_dump"):
        unit_input = unit_input.model_dump()
    elif hasattr(unit_input, "__dict__"):
        unit_input = unit_input.__dict__

    return {
        "session_id"       : session_id,
        "unit_input"       : unit_input,
        "generated_content": session.get("generated_content", {}),
    }


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Generate ALL templates at once (with MongoDB cache)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.post("/unit/generate-all/{session_id}")
async def generate_all_templates(session_id: str):
    session    = _get_session(session_id)
    unit_input = session["unit_input"]
    cache_key  = make_cache_key(unit_input)

    def _safe(r):
        return r if not isinstance(r, Exception) else None

    # â”€â”€ Cache HIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cached = None
    try:
        cached = cache_collection.find_one({"cache_key": cache_key})
    except Exception as e:
        print(f"Cache read failed (MongoDB unreachable?): {e}")

    if cached:
        content      = cached["content"]
        has_ncl      = bool(content.get("ncl"))
        has_subtopics = bool(content.get("subtopics", {}).get("subtopics"))

        # â”€â”€ Outdated cache format (pre-dates subtopics/ncl structure) â”€â”€
        # Delete and fall through to full regeneration
        if not has_ncl and not has_subtopics:
            print(f"Cache HIT but outdated format â€” invalidating {cache_key}")
            try:
                cache_collection.delete_one({"cache_key": cache_key})
            except Exception:
                pass
            cached = None

        # â”€â”€ Partial cache: has subtopics but NCL was not yet generated â”€â”€
        # Backfill NCL in-place and update the cache entry
        elif not has_ncl and has_subtopics:
            print(f"Cache HIT but NCL missing â€” backfilling for {cache_key}")
            subs      = content["subtopics"]["subtopics"]
            ncl_tasks = await asyncio.gather(
                *[
                    generate_ncl(unit_input, st["label"], session["performance"])
                    for st in subs
                ],
                return_exceptions=True,
            )
            ncl_content = {}
            for i, st in enumerate(subs):
                if isinstance(ncl_tasks[i], Exception):
                    print(f"  [WARN] ncl backfill [{st['key']}] failed: {ncl_tasks[i]}")
                ncl_content[st["key"]] = _safe(ncl_tasks[i])
            content["ncl"] = ncl_content
            try:
                cache_collection.update_one(
                    {"cache_key": cache_key},
                    {"$set": {"content.ncl": ncl_content}}
                )
                print(f"NCL backfilled in cache: {cache_key}")
            except Exception as e:
                print(f"Cache NCL update failed: {e}")

        # â”€â”€ Good cache hit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if cached is not None:
            print(f"Cache HIT  : {cache_key}")
            try:
                cache_collection.update_one(
                    {"cache_key": cache_key},
                    {"$inc": {"hit_count": 1}}
                )
            except Exception:
                pass
            session["generated_content"] = content
            save_session_to_db(session_id, session)
            return {
                "source": "cache",
                "message": "Loaded from cache instantly",
                "content": content,
            }

    # â”€â”€ Cache MISS â€” generate in parallel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print(f"Cache MISS : {cache_key} - generating...")

    # Step 1: base content + subtopics in parallel
    base_results = await asyncio.gather(
        generate_provocation(unit_input, session["performance"]),
        generate_analysis(unit_input, session["performance"]),
        generate_discussion(unit_input, session["performance"]),
        generate_reflection(
            unit_input,
            session["performance"].get("exitTicketScore"),
            session["performance"].get("masteryGateResult", ""),
            session["performance"].get("projectIdea", ""),
            "",
            session["performance"],
        ),
        generate_subtopics(unit_input, session["performance"]),
        return_exceptions=True,
    )

    for i, r in enumerate(base_results):
        if isinstance(r, Exception):
            print(f"  [WARN] base_result[{i}] failed: {r}")

    provocation = _safe(base_results[0])
    analysis    = _safe(base_results[1])
    discussion  = _safe(base_results[2])
    reflection  = _safe(base_results[3])
    subtopics   = _safe(base_results[4])

    # Step 2: NCL for every subtopic in parallel
    ncl_content = {}
    if subtopics and subtopics.get("subtopics"):
        ncl_tasks = await asyncio.gather(
            *[
                generate_ncl(
                    unit_input,
                    st["label"],
                    session["performance"],
                )
                for st in subtopics["subtopics"]
            ],
            return_exceptions=True,
        )
        for i, st in enumerate(subtopics["subtopics"]):
            result = ncl_tasks[i]
            if isinstance(result, Exception):
                print(f"  [WARN] ncl[{st['key']}] failed: {result}")
            ncl_content[st["key"]] = _safe(result)

    content = {
        "provocation": provocation,
        "analysis":    analysis,
        "discussion":  discussion,
        "reflection":  reflection,
        "subtopics":   subtopics,
        "ncl":         ncl_content,
    }

    # â”€â”€ Persist to MongoDB (best-effort â€” don't crash if DB is down) â”€
    try:
        cache_collection.insert_one({
            "cache_key":  cache_key,
            "grade":      unit_input.grade,
            "subject":    unit_input.subject,
            "chapter":    unit_input.chapter,
            "context":    unit_input.context,
            "content":    content,
            "created_at": datetime.datetime.utcnow(),
            "hit_count":  0,
        })
        print(f"Cached     : {cache_key}")
    except Exception as e:
        print(f"Cache write failed (MongoDB unreachable?): {e}")

    session["generated_content"] = content
    save_session_to_db(session_id, session)
    return {
        "source":  "generated",
        "message": "Unit generated and cached",
        "content": content,
    }


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Template endpoints  (cache-aware)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.post("/generate/provocation/{session_id}")
async def get_provocation(session_id: str):
    session = _get_session(session_id)
    gc = session.get("generated_content", {})
    if gc.get("provocation"):
        return gc["provocation"]
    try:
        return await generate_provocation(
            session["unit_input"], session["performance"]
        )
    except HTTPException:
        raise
    except Exception as exc:
        message = str(exc)
        print(f"[ERROR] Failed to generate provocation for {session_id}: {message}")
        if "credit balance is too low" in message.lower():
            raise HTTPException(
                status_code=503,
                detail="Provocation generation is temporarily unavailable because the Anthropic API account has no credits."
            ) from exc
        raise HTTPException(status_code=500, detail="Failed to generate provocation") from exc


@app.post("/generate/ncl/{session_id}")
async def get_ncl(session_id: str, subtopic: str, data: dict = Body(default={})):
    session             = _get_session(session_id)
    student_observation = data.get("student_observation", "")
    student_reflection  = data.get("student_reflection",  "")
    # NCL is subtopic-specific â€” always generate fresh
    return await generate_ncl(
        session["unit_input"], subtopic, session["performance"],
        student_observation, student_reflection,
    )


@app.post("/check/answer")
async def answer_check(answer_input: AnswerInput):
    session = _get_session(answer_input.session_id)
    return await check_answer(
        session["unit_input"],
        answer_input.question,
        answer_input.correct_answer,
        answer_input.student_answer,
        answer_input.subtopic,
        answer_input.dimension,
        answer_input.level,
        session["performance"],
    )


@app.post("/check/answers-batch")
async def check_answers_batch(data: dict):
    """
    Checks all student answers at once.
    Called once when student submits all questions.
    Returns results for every question together.
    Only calls AI for wrong answers (correct ones need no AI feedback).
    """
    session_id = data.get("session_id")
    answers    = data.get("answers", [])

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    unit_input = session["unit_input"]
    results = []

    for answer in answers:
        question       = answer.get("question", "")
        correct_answer = answer.get("correct_answer", "")
        student_answer = answer.get("student_answer", "")
        subtopic       = answer.get("subtopic", "")
        dimension      = answer.get("dimension", "knowledge")
        level          = answer.get("level", "medium")

        is_correct = student_answer.strip().lower() == correct_answer.strip().lower()

        if is_correct:
            result = {
                "question"      : question,
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "is_correct"    : True,
                "feedback"      : "Correct! Well done.",
                "explanation"   : answer.get("explanation", ""),
                "level"         : level,
            }
        else:
            try:
                ai_result = await check_answer(
                    unit_input, question, correct_answer,
                    student_answer, subtopic, dimension, level,
                    session.get("performance", {}),
                )
                result = {
                    "question"      : question,
                    "student_answer": student_answer,
                    "correct_answer": correct_answer,
                    "is_correct"    : False,
                    "feedback"      : ai_result.get("feedback", ""),
                    "hint"          : ai_result.get("hint", ""),
                    "explanation"   : answer.get("explanation", ""),
                    "level"         : level,
                }
            except Exception:
                result = {
                    "question"      : question,
                    "student_answer": student_answer,
                    "correct_answer": correct_answer,
                    "is_correct"    : False,
                    "feedback"      : "Incorrect.",
                    "explanation"   : answer.get("explanation", ""),
                    "level"         : level,
                }

        results.append(result)

    score = sum(1 for r in results if r["is_correct"])
    total = len(results)

    if score >= max(1, round(total * 0.8)):
        colour, message = "green", "Excellent work!"
    elif score >= max(1, round(total * 0.5)):
        colour, message = "amber", "Good effort. Some concepts need review."
    else:
        colour, message = "red", "This topic needs more attention."

    return {"score": score, "total": total, "colour": colour,
            "message": message, "results": results}


@app.post("/check/analysis")
async def check_analysis_responses(data: dict):
    """
    Reviews a student's graphic-organiser analysis in one call.
    Returns warm feedback on what they found + an ideal analysis.
    """
    from framework.prompts import ANALYSIS_CHECK_PROMPT
    from framework.mat_engine import build_system_base, call_claude

    session_id = data.get("session_id")
    responses  = data.get("responses", {})

    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    unit_input  = session["unit_input"]
    system_base = build_system_base(unit_input, session.get("performance", {}))

    prompt = ANALYSIS_CHECK_PROMPT.format(
        system_base  = system_base,
        observations = responses.get("observations", ""),
        patterns     = responses.get("patterns", ""),
        surprises    = responses.get("surprises", ""),
        conclusion   = responses.get("conclusion", ""),
        chapter      = unit_input.chapter,
        context      = unit_input.context,
    )

    result = await asyncio.to_thread(call_claude, prompt, 800)
    return result


@app.post("/check/provocation/{session_id}")
async def check_provocation(session_id: str, data: dict = Body(default={})):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await generate_provocation_feedback(
        session["unit_input"],
        data.get("observation", ""),
        data.get("reflections", []),
        session.get("performance", {}),
    )
    return result


@app.post("/check/open-ended")
async def check_open_ended(data: dict):
    """AI feedback on any open-ended student response (provocation, analysis, discussion, reflection)."""
    session_id = data.get("session_id", "")
    session    = _get_session(session_id)
    return await check_open_ended_response(
        unit_input=session["unit_input"],
        template=data.get("template", ""),
        question=data.get("question", ""),
        student_response=data.get("response", ""),
        performance=session["performance"],
    )


@app.post("/generate/discussion/{session_id}")
async def get_discussion(session_id: str):
    session = _get_session(session_id)
    gc = session.get("generated_content", {})
    if gc.get("discussion"):
        return gc["discussion"]
    return await generate_discussion(
        session["unit_input"], session["performance"]
    )


@app.post("/generate/subtopics/{session_id}")
async def get_subtopics(session_id: str):
    """Return chapter-specific sub-topics for the Mastery Gate.
    Served from cache (generated_content) if already available."""
    session = _get_session(session_id)
    cached = session.get("generated_content", {}).get("subtopics")
    if cached:
        return cached
    result = await generate_subtopics(
        session["unit_input"], session.get("performance", {})
    )
    session.setdefault("generated_content", {})["subtopics"] = result
    save_session_to_db(session_id, session)
    return result


@app.get("/generate/exit-ticket/{session_id}")
async def get_exit_ticket(session_id: str):
    """Collect 1-2 questions per subtopic from pre-generated NCL content."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    ncl_content = session.get("generated_content", {}).get("ncl", {})
    if not ncl_content:
        raise HTTPException(status_code=404, detail="NCL content not generated yet")

    all_questions = []
    for subtopic_key, ncl_data in ncl_content.items():
        if ncl_data and ncl_data.get("questions"):
            for q in ncl_data["questions"][:2]:
                q["subtopic_key"]   = subtopic_key
                q["subtopic_label"] = ncl_data.get("subtopic_name", subtopic_key)
                all_questions.append(q)

    if len(all_questions) > 10:
        all_questions = random.sample(all_questions, 10)

    return {
        "questions": all_questions,
        "total":     len(all_questions),
        "source":    "ncl_content",
    }


@app.post("/generate/mastery-all/{session_id}")
async def generate_all_mastery_questions(session_id: str):
    """Pre-generate all mastery questions for a session so MasteryGate loads instantly."""
    session    = _get_session(session_id)
    unit_input = session["unit_input"]
    cache_key  = make_cache_key(unit_input) + "_mastery"

    # â”€â”€ Cache HIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    cached = None
    try:
        cached = cache_collection.find_one({"cache_key": cache_key})
    except Exception as e:
        print(f"Mastery cache read failed (MongoDB unreachable?): {e}")

    if cached:
        cached.pop("_id", None)
        session["mastery_questions"] = cached["questions"]
        return {"source": "cache", "questions": cached["questions"]}

    # â”€â”€ Resolve subtopics dynamically from session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    subtopics_data = session.get("generated_content", {}).get("subtopics")
    if subtopics_data and subtopics_data.get("subtopics"):
        raw = subtopics_data["subtopics"]
        subtopic_labels = [st["label"] for st in raw]   # human-readable â†’ passed to Claude
        subtopic_keys   = [st["key"]   for st in raw]   # snake_case    â†’ used as dict key
    else:
        # Fallback: generate subtopics on the fly
        print(f"[mastery-all] No cached subtopics â€” generating now...")
        try:
            sub_result = await generate_subtopics(unit_input, session.get("performance", {}))
            raw = sub_result.get("subtopics", [])
        except Exception as e:
            print(f"[mastery-all] generate_subtopics failed: {e}; using generic fallback")
            raw = []
        if raw:
            subtopic_labels = [st["label"] for st in raw]
            subtopic_keys   = [st["key"]   for st in raw]
            session.setdefault("generated_content", {})["subtopics"] = sub_result
            save_session_to_db(session_id, session)
        else:
            # Last-resort generic fallback so something always renders
            subtopic_labels = ["Core Concepts", "Key Rules", "Applications", "Problem Solving"]
            subtopic_keys   = ["core_concepts", "key_rules",  "applications", "problem_solving"]

    print(f"[mastery-all] Using subtopics: {subtopic_labels}")

    # â”€â”€ Generate 4 questions per subtopic in parallel â”€â”€â”€â”€â”€
    tasks = []
    for label in subtopic_labels:
        tasks.append(generate_mastery_question(unit_input, label, "knowledge", "easy",   session["performance"]))
        tasks.append(generate_mastery_question(unit_input, label, "knowledge", "medium", session["performance"]))
        tasks.append(generate_mastery_question(unit_input, label, "skills",    "medium", session["performance"]))
        tasks.append(generate_mastery_question(unit_input, label, "skills",    "hard",   session["performance"]))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    def _safe(r):
        return r if not isinstance(r, Exception) else None

    questions = {}
    idx = 0
    for key in subtopic_keys:
        questions[key] = {
            "knowledge": [_safe(results[idx]),     _safe(results[idx + 1])],
            "skills":    [_safe(results[idx + 2]), _safe(results[idx + 3])],
        }
        idx += 4

    # Log any failures (no emoji â€” Windows cp1252 safe)
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"  [WARN] mastery result[{i}] failed: {r}")

    # â”€â”€ Cache (best-effort) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try:
        cache_collection.insert_one({
            "cache_key":  cache_key,
            "questions":  questions,
            "created_at": datetime.datetime.utcnow(),
        })
    except Exception as e:
        print(f"Mastery cache write failed (MongoDB unreachable?): {e}")

    session["mastery_questions"] = questions
    return {"source": "generated", "questions": questions}


@app.post("/generate/mastery-question/{session_id}")
async def get_mastery_question(
    session_id: str, subtopic: str, dimension: str, level: str
):
    session = _get_session(session_id)

    # Serve from pre-generated pool if available (populated by generate_all_mastery_questions)
    if "mastery_questions" in session:
        key = subtopic.replace(" ", "_")
        pre = session["mastery_questions"]
        if key in pre and dimension in pre[key]:
            available = [q for q in pre[key][dimension] if q is not None]
            if available:
                return random.choice(available)

    # Fall back to fresh generation
    return await generate_mastery_question(
        session["unit_input"], subtopic, dimension, level,
        session["performance"],
    )


@app.post("/generate/analysis/{session_id}")
async def get_analysis(session_id: str, data: dict = Body(default={})):
    session = _get_session(session_id)
    gc = session.get("generated_content", {})
    if gc.get("analysis"):
        return gc["analysis"]
    weak_subtopics = data.get("weak_subtopics", [])
    return await generate_analysis(
        session["unit_input"], session["performance"], weak_subtopics
    )


@app.post("/generate/ncl-review/{session_id}")
async def get_ncl_review(session_id: str, data: dict = Body(default={})):
    session = _get_session(session_id)
    weak_subtopics  = data.get("weak_subtopics",  [])
    wrong_questions = data.get("wrong_questions", [])
    return await generate_ncl_review(
        session["unit_input"],
        weak_subtopics,
        wrong_questions,
        session.get("performance", {}),
    )


@app.post("/guide/project")
async def project_guide(project_message: ProjectMessage):
    session = _get_session(project_message.session_id)
    return await guide_project(
        session["unit_input"],
        project_message.project_idea,
        project_message.message,
        project_message.progress,
        session["performance"],
    )


@app.post("/generate/reflection/{session_id}")
async def get_reflection(
    session_id: str,
    data: dict = Body(default={}),
):
    """Generate a personalised reflection using actual student performance data."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Pull performance data from request body first, then fall back to session
    perf = session.get("performance", {})
    exit_ticket_score       = data.get("exit_ticket_score")
    mastery_gate_result     = data.get("mastery_gate_result", "")
    project_idea            = data.get("project_idea", "")
    templates_completed     = data.get("templates_completed", "")
    provocation_observation = data.get("provocation_observation", "")
    provocation_reflections = data.get("provocation_reflections", [])

    if exit_ticket_score is None:
        exit_ticket_score = perf.get("exitTicketScore")
    if not mastery_gate_result:
        mastery_gate_result = perf.get("masteryGateResult", "")

    result = await generate_reflection(
        session["unit_input"],
        exit_ticket_score,
        mastery_gate_result,
        project_idea,
        templates_completed,
        perf,
        provocation_observation,
        provocation_reflections,
    )

    # Cache the personalised reflection in the session
    session.setdefault("generated_content", {})["reflection"] = result
    save_session_to_db(session_id, session)

    return result


_DEFAULT_CONTEXTS = [
    "Cricket", "Cooking", "Space", "Music",
    "Travel", "Nature", "Sports", "Technology",
]


@app.post("/generate/context-suggestions")
async def get_context_suggestions(data: dict = Body(default={})):
    grade   = data.get("grade", "")
    subject = data.get("subject", "")
    chapter = data.get("chapter", "")

    if not chapter:
        return {"contexts": _DEFAULT_CONTEXTS}

    cache_key = f"{grade}|{subject}|{chapter}"
    if cache_key in _context_cache:
        return _context_cache[cache_key]

    try:
        result = await generate_context_suggestions(grade, subject, chapter)
        if result.get("contexts") and len(result["contexts"]) > 0:
            _context_cache[cache_key] = result
            return result
        return {"contexts": _DEFAULT_CONTEXTS}
    except Exception as e:
        print(f"Context suggestion error: {e}")
        return {"contexts": _DEFAULT_CONTEXTS}


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# RAC â€” Research and Artifact Creation
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@app.post("/generate/rac-suggestions/{session_id}")
async def get_rac_suggestions(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # In-memory cache â€” repeat calls within the same server process are instant
    if session_id in _rac_cache:
        return _rac_cache[session_id]

    mastery_result = session.get("performance", {}).get("masteryGateResult", "")
    result = await generate_rac_suggestions(
        session["unit_input"],
        mastery_result,
        session.get("performance", {}),
    )
    _rac_cache[session_id] = result
    return result


@app.post("/generate/rac-template/{session_id}")
async def get_rac_template(session_id: str, data: dict):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    project_idea = data.get("project_idea", "")
    if not project_idea:
        raise HTTPException(status_code=400, detail="Project idea is required")

    result = await generate_rac_template(
        session["unit_input"],
        project_idea,
        session.get("performance", {}),
    )

    session.setdefault("generated_content", {})["rac_template"] = result
    save_session_to_db(session_id, session)
    return result


@app.post("/check/rac-section/{session_id}")
async def check_rac_section(session_id: str, data: dict):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await get_rac_section_feedback(
        session["unit_input"],
        data.get("project_idea", ""),
        data.get("section_title", ""),
        data.get("guiding_question", ""),
        data.get("student_content", ""),
        session.get("performance", {}),
    )
    return result


@app.post("/save/rac-artifact/{session_id}")
async def save_rac_artifact(session_id: str, data: dict):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    artifact = {
        "session_id"  : session_id,
        "project_idea": data.get("project_idea"),
        "report_title": data.get("report_title"),
        "sections"    : data.get("sections"),
        "created_at"  : datetime.datetime.utcnow(),
    }

    try:
        db["artifacts"].insert_one(artifact)
        artifact.pop("_id", None)
    except Exception as e:
        print(f"[WARN] Could not save artifact: {e}")

    session.setdefault("generated_content", {})["rac_artifact"] = data
    save_session_to_db(session_id, session)
    return {"saved": True, "artifact": data}


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Cache management
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@app.get("/cache/stats")
async def cache_stats():
    total = cache_collection.count_documents({})
    units = list(cache_collection.find(
        {},
        {
            "_id": 0, "cache_key": 1, "grade": 1,
            "subject": 1, "chapter": 1, "context": 1,
            "created_at": 1, "hit_count": 1,
        }
    ))
    return {"total_cached_units": total, "units": units}


@app.delete("/cache/clear")
async def clear_cache():
    result = cache_collection.delete_many({})
    return {"message": f"Cleared {result.deleted_count} cached units"}


@app.post("/student/progress")
async def save_student_progress(data: dict = Body(default={})):
    student_id = data.get("student_id")
    progress   = data.get("progress", {})
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required")
    try:
        progress_collection.update_one(
            {"student_id": student_id},
            {"$set": {
                "student_id": student_id,
                "progress"  : progress,
                "updated_at": datetime.datetime.utcnow(),
            }},
            upsert=True,
        )
    except Exception as e:
        print(f"[WARN] Could not save progress: {e}")
    return {"saved": True}


@app.get("/student/{student_id}/progress")
async def get_student_progress(student_id: str):
    try:
        doc = progress_collection.find_one(
            {"student_id": student_id}, {"_id": 0}
        )
        if not doc:
            return {"progress": None}
        return {"progress": doc.get("progress")}
    except Exception as e:
        print(f"[WARN] Could not get progress: {e}")
        return {"progress": None}


@app.post("/student/save-completed-unit")
async def save_completed_unit(data: dict = Body(default={})):
    student_id = data.get("student_id")
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id required")

    raw_score = data.get("exit_ticket_score")
    try:
        exit_score = int(raw_score) if raw_score is not None else None
    except (TypeError, ValueError):
        exit_score = None

    raw_total = data.get("exit_ticket_total")
    try:
        exit_total = int(raw_total) if raw_total is not None else None
    except (TypeError, ValueError):
        exit_total = None

    completed_unit = {
        "completed_at"        : datetime.datetime.utcnow(),
        "chapter"             : data.get("chapter"),
        "grade"               : data.get("grade"),
        "subject"             : data.get("subject"),
        "context"             : data.get("context"),
        "exit_ticket_score"   : exit_score,
        "exit_ticket_total"   : exit_total,
        "mastery_gate_result" : data.get("mastery_gate_result"),
        "strong_subtopics"    : data.get("strong_subtopics", []),
        "weak_subtopics"      : data.get("weak_subtopics", []),
        "project_idea"        : data.get("project_idea", ""),
        "session_id"          : data.get("session_id"),
    }

    try:
        # Try existing record in students_collection first (no upsert)
        result = students_collection.update_one(
            {"student_id": student_id},
            {
                "$push": {"completed_units": completed_unit},
                "$set" : {"updated_at": datetime.datetime.utcnow()},
            },
        )
        if result.matched_count == 0:
            # No existing student doc — save against the users_collection record
            users_collection.update_one(
                {"user_id": student_id},
                {
                    "$push": {"completed_units": completed_unit},
                    "$set" : {"updated_at": datetime.datetime.utcnow()},
                },
                upsert=True,
            )
            print(f"[INFO] Saved completed unit to users_collection for {student_id}")
        else:
            print(f"[INFO] Saved completed unit to students_collection for {student_id}")
    except Exception as e:
        print(f"[WARN] Could not save completed unit: {e}")

    return {"saved": True}


@app.get("/student/{student_id}/history")
async def get_student_history(student_id: str):
    try:
        student = students_collection.find_one(
            {"student_id": student_id},
            {"_id": 0},
        )
        if not student:
            # Fall back to users_collection (units saved directly against user record)
            student = users_collection.find_one(
                {"user_id": student_id},
                {"_id": 0},
            )
        if not student:
            return {"completed_units": [], "stats": {}}

        units = student.get("completed_units", [])

        scores = [
            u.get("exit_ticket_score")
            for u in units
            if u.get("exit_ticket_score") is not None
        ]

        from collections import Counter
        all_weak   = []
        all_strong = []
        for u in units:
            all_weak.extend(u.get("weak_subtopics",   []))
            all_strong.extend(u.get("strong_subtopics", []))

        weak_counts   = Counter(all_weak)
        strong_counts = Counter(all_strong)

        stats = {
            "total_units_completed": len(units),
            "avg_exit_score"       : round(sum(scores) / len(scores), 1) if scores else None,
            "top_weak_topics"      : [k for k, _ in weak_counts.most_common(3)],
            "top_strong_topics"    : [k for k, _ in strong_counts.most_common(3)],
            "subjects_studied"     : list(set(u.get("subject", "") for u in units)),
            "streak_days"          : 0,
        }

        # Sort most recent first; datetime objects serialise fine, strings sort lexically
        def _sort_key(u):
            v = u.get("completed_at", "")
            return v.isoformat() if hasattr(v, "isoformat") else str(v)

        return {
            "completed_units": sorted(units, key=_sort_key, reverse=True),
            "stats": stats,
        }
    except Exception as e:
        print(f"[WARN] Could not get history: {e}")
        return {"completed_units": [], "stats": {}}


@app.post("/generate/final-summary/{session_id}")
async def get_final_summary(session_id: str, data: dict = Body(default={})):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await generate_final_summary(
        session["unit_input"],
        data.get("exit_ticket_score"),
        data.get("mastery_gate_result", ""),
        data.get("strong_subtopics", []),
        data.get("weak_subtopics", []),
        data.get("project_idea", ""),
        data.get("provocation_observation", ""),
        session.get("performance", {}),
    )
    return result
