import asyncio
import datetime
import hashlib
import os
import random
import string
import uuid

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo import MongoClient

from auth import create_token, decode_token, hash_password, verify_password
from framework.mat_engine import (
    check_answer,
    check_open_ended_response,
    generate_analysis,
    generate_discussion,
    generate_mastery_question,
    generate_ncl,
    generate_provocation,
    generate_reflection,
    generate_subtopics,
    guide_project,
)
from models import AnswerInput, LoginRequest, ProjectMessage, RegisterRequest, UnitInput

# ── Environment ───────────────────────────────────────────
load_dotenv()

# ── MongoDB ───────────────────────────────────────────────
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")

# Use TLS only for Atlas (cloud) connections; local MongoDB does not need it
use_tls = "mongodb+srv" in MONGODB_URI or "mongodb.net" in MONGODB_URI

if use_tls:
    mongo_client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
        tls=True,
        tlsAllowInvalidCertificates=True,
    )
else:
    mongo_client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000,
        socketTimeoutMS=5000,
    )
db = mongo_client["shikha_framework"]
cache_collection    = db["unit_cache"]
sessions_collection = db["sessions"]
classes_collection  = db["classes"]
students_collection = db["students"]
progress_collection = db["progress"]
users_collection    = db["users"]

# ── FastAPI app ───────────────────────────────────────────
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

# ── In-memory session store ───────────────────────────────
sessions = {}


# ── Explicit OPTIONS preflight handler ────────────────────
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


# ── Helpers ───────────────────────────────────────────────
def generate_class_code() -> str:
    letters = random.choices(string.ascii_uppercase, k=3)
    digits  = random.choices(string.digits, k=3)
    return f"{''.join(letters)}-{''.join(digits)}"


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


# ── Session persistence helpers ───────────────────────────
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


# ── Auth helpers ───────────────────────────────────────────
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return users_collection.find_one(
        {"user_id": payload.get("user_id")},
        {"_id": 0, "password": 0},
    )


# ──────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "system": "Shikha Adaptive Learning Framework",
        "version": "2.2",
        "status": "running",
    }


# ──────────────────────────────────────────────────────────
# Auth endpoints
# ──────────────────────────────────────────────────────────
@app.post("/auth/register")
async def register(request: RegisterRequest):
    try:
        existing = users_collection.find_one({"email": request.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = str(uuid.uuid4())
        user = {
            "user_id"   : user_id,
            "name"      : request.name.strip(),
            "email"     : request.email.lower().strip(),
            "password"  : hash_password(request.password),
            "role"      : request.role,
            "created_at": datetime.datetime.utcnow(),
        }
        users_collection.insert_one(user)

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
    except HTTPException:
        raise
    except Exception as e:
        print(f"Register error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login")
async def login(request: LoginRequest):
    user = users_collection.find_one({"email": request.email.lower()})
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


# ──────────────────────────────────────────────────────────
# Unit creation
# ──────────────────────────────────────────────────────────
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


# ──────────────────────────────────────────────────────────
# Generate ALL templates at once (with MongoDB cache)
# ──────────────────────────────────────────────────────────
@app.post("/unit/generate-all/{session_id}")
async def generate_all_templates(session_id: str):
    session    = _get_session(session_id)
    unit_input = session["unit_input"]
    cache_key  = make_cache_key(unit_input)

    # ── Cache HIT ─────────────────────────────────────────
    cached = None
    try:
        cached = cache_collection.find_one({"cache_key": cache_key})
    except Exception as e:
        print(f"Cache read failed (MongoDB unreachable?): {e}")

    if cached:
        print(f"Cache HIT  : {cache_key}")
        try:
            cache_collection.update_one(
                {"cache_key": cache_key},
                {"$inc": {"hit_count": 1}}
            )
        except Exception:
            pass
        session["generated_content"] = cached["content"]
        save_session_to_db(session_id, session)
        return {
            "source": "cache",
            "message": "Loaded from cache instantly",
            "content": cached["content"],
        }

    # ── Cache MISS — generate in parallel ─────────────────
    print(f"Cache MISS : {cache_key} - generating...")

    def _safe(r):
        return r if not isinstance(r, Exception) else None

    # Step 1: base content + subtopics in parallel
    base_results = await asyncio.gather(
        generate_provocation(unit_input, session["performance"]),
        generate_analysis(unit_input, session["performance"]),
        generate_discussion(unit_input, session["performance"]),
        generate_reflection(unit_input, "", "", "", "", session["performance"]),
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

    # ── Persist to MongoDB (best-effort — don't crash if DB is down) ─
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


# ──────────────────────────────────────────────────────────
# Template endpoints  (cache-aware)
# ──────────────────────────────────────────────────────────
@app.post("/generate/provocation/{session_id}")
async def get_provocation(session_id: str):
    session = _get_session(session_id)
    gc = session.get("generated_content", {})
    if gc.get("provocation"):
        return gc["provocation"]
    return await generate_provocation(
        session["unit_input"], session["performance"]
    )


@app.post("/generate/ncl/{session_id}")
async def get_ncl(session_id: str, subtopic: str):
    session = _get_session(session_id)
    # NCL is subtopic-specific — always generate fresh
    return await generate_ncl(
        session["unit_input"], subtopic, session["performance"]
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

    # ── Cache HIT ─────────────────────────────────────────
    cached = None
    try:
        cached = cache_collection.find_one({"cache_key": cache_key})
    except Exception as e:
        print(f"Mastery cache read failed (MongoDB unreachable?): {e}")

    if cached:
        cached.pop("_id", None)
        session["mastery_questions"] = cached["questions"]
        return {"source": "cache", "questions": cached["questions"]}

    # ── Resolve subtopics dynamically from session ────────────
    subtopics_data = session.get("generated_content", {}).get("subtopics")
    if subtopics_data and subtopics_data.get("subtopics"):
        raw = subtopics_data["subtopics"]
        subtopic_labels = [st["label"] for st in raw]   # human-readable → passed to Claude
        subtopic_keys   = [st["key"]   for st in raw]   # snake_case    → used as dict key
    else:
        # Fallback: generate subtopics on the fly
        print(f"[mastery-all] No cached subtopics — generating now...")
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

    # ── Generate 4 questions per subtopic in parallel ─────
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

    # Log any failures (no emoji — Windows cp1252 safe)
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"  [WARN] mastery result[{i}] failed: {r}")

    # ── Cache (best-effort) ───────────────────────────────
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
async def get_analysis(session_id: str):
    session = _get_session(session_id)
    gc = session.get("generated_content", {})
    if gc.get("analysis"):
        return gc["analysis"]
    return await generate_analysis(
        session["unit_input"], session["performance"]
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
    exit_ticket_score: str = "",
    mastery_gate_result: str = "",
    project_idea: str = "",
    templates_completed: str = "",
):
    session = _get_session(session_id)
    # Reflection is always personalised — never serve from cache
    return await generate_reflection(
        session["unit_input"],
        exit_ticket_score,
        mastery_gate_result,
        project_idea,
        templates_completed,
        session["performance"],
    )


# ──────────────────────────────────────────────────────────
# Cache management
# ──────────────────────────────────────────────────────────
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


# ──────────────────────────────────────────────────────────
# Class management
# ──────────────────────────────────────────────────────────

@app.post("/class/create")
async def create_class(data: dict):
    """Teacher creates a class; students join with the returned code."""
    session_id = data.get("session_id")
    print(f"[class/create] session_id={session_id}")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required. Please generate a unit first.")

    # Return existing class record for this session if one already exists
    # (checked before the session-in-memory guard so it works after a server restart)
    existing = classes_collection.find_one({"session_id": session_id})
    if existing:
        print(f"[class/create] returning existing class: {existing['class_code']}")
        existing.pop("_id", None)
        return {
            "class_code"    : existing["class_code"],
            "session_id"    : session_id,
            "shareable_link": f"/join/{existing['class_code']}",
            "unit_input"    : existing["unit_input"],
        }

    # Session must be available (memory or MongoDB) to create a new class record
    session = get_session(session_id)
    if not session:
        print(f"[class/create] session not found in memory or MongoDB")
        raise HTTPException(
            status_code=404,
            detail="Session expired. Please generate the unit again to create a class."
        )
    print(f"[class/create] session found, creating new class record")

    # Generate a unique class code
    class_code = generate_class_code()
    while classes_collection.find_one({"class_code": class_code}):
        class_code = generate_class_code()

    unit_dict = _unit_input_dict(session["unit_input"])
    class_record = {
        "session_id"       : session_id,
        "class_code"       : class_code,
        "unit_input"       : unit_dict,
        "generated_content": session.get("generated_content", {}),
        "created_at"       : datetime.datetime.utcnow(),
        "students"         : [],
        "status"           : "active",
        "teacher_id"       : session.get("teacher_id"),
    }
    classes_collection.insert_one(class_record)
    print(f"[class/create] created class: {class_code}")

    return {
        "class_code"    : class_code,
        "session_id"    : session_id,
        "shareable_link": f"/join/{class_code}",
        "unit_input"    : unit_dict,
    }


@app.get("/class/{class_code}")
async def get_class(class_code: str):
    """Student looks up a class by code before entering their name."""
    record = classes_collection.find_one({"class_code": class_code.upper()})
    if not record:
        raise HTTPException(status_code=404, detail="Class not found. Check your code.")
    return {
        "class_code": record["class_code"],
        "unit_input": record["unit_input"],
        "session_id": record["session_id"],
    }


@app.post("/class/{class_code}/join")
async def join_class(class_code: str, data: dict):
    """Student joins with their name. Restores progress for returning students."""
    student_name = data.get("name", "").strip()
    if not student_name:
        raise HTTPException(status_code=400, detail="Name is required")

    record = classes_collection.find_one({"class_code": class_code.upper()})
    if not record:
        raise HTTPException(status_code=404, detail="Class not found")

    session_id = record["session_id"]

    # Restore session in memory if it was lost (e.g. server restart)
    if session_id not in sessions:
        if not restore_session_from_db(session_id):
            # Fall back to class record (for sessions pre-dating DB persistence)
            ui = record["unit_input"]
            sessions[session_id] = {
                "unit_input"       : UnitInput(**ui),
                "performance"      : {},
                "generated_content": record.get("generated_content", {}),
            }

    # Returning student — restore progress
    existing = students_collection.find_one({
        "class_code"  : class_code.upper(),
        "student_name": student_name,
    })
    if existing:
        existing.pop("_id", None)
        return {
            "student_id"  : existing["student_id"],
            "student_name": student_name,
            "session_id"  : session_id,
            "progress"    : existing.get("progress", {}),
            "returning"   : True,
        }

    # New student
    student_id = str(uuid.uuid4())
    default_progress = {
        "current_screen"      : "provocation",
        "completed_templates" : [],
        "exit_ticket_score"   : None,
        "mastery_gate_result" : None,
        "project_idea"        : "",
        "reflection_done"     : False,
    }
    students_collection.insert_one({
        "student_id"  : student_id,
        "student_name": student_name,
        "class_code"  : class_code.upper(),
        "session_id"  : session_id,
        "progress"    : default_progress,
        "joined_at"   : datetime.datetime.utcnow(),
    })
    return {
        "student_id"  : student_id,
        "student_name": student_name,
        "session_id"  : session_id,
        "progress"    : default_progress,
        "returning"   : False,
    }


@app.post("/student/progress")
async def save_progress(data: dict):
    """Save student progress after each completed template."""
    student_id = data.get("student_id")
    progress   = data.get("progress", {})

    if not student_id:
        return {"saved": False, "error": "No student_id"}

    students_collection.update_one(
        {"student_id": student_id},
        {"$set": {"progress": progress, "updated_at": datetime.datetime.utcnow()}},
        upsert=True,
    )
    return {"saved": True}


@app.get("/student/{student_id}/progress")
async def get_student_progress(student_id: str):
    student = students_collection.find_one(
        {"student_id": student_id}, {"_id": 0}
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@app.get("/class/{class_code}/results")
async def get_class_results(class_code: str):
    """Teacher fetches all student progress for a class, with summary stats."""
    students = list(students_collection.find(
        {"class_code": class_code.upper()}, {"_id": 0}
    ))
    total = len(students)
    complete = sum(
        1 for s in students
        if s.get("progress", {}).get("reflection_done")
    )
    in_progress = sum(
        1 for s in students
        if len(s.get("progress", {}).get("completed_templates", [])) > 0
        and not s.get("progress", {}).get("reflection_done")
    )
    return {
        "class_code"    : class_code.upper(),
        "total_students": total,
        "complete"      : complete,
        "in_progress"   : in_progress,
        "students"      : students,
    }


@app.put("/class/{class_code}/content")
async def update_content(class_code: str, data: dict):
    """Teacher edits AI-generated content before students see it."""
    record = classes_collection.find_one({"class_code": class_code.upper()})
    if not record:
        raise HTTPException(status_code=404, detail="Class not found")

    template    = data.get("template")
    new_content = data.get("content")

    classes_collection.update_one(
        {"class_code": class_code.upper()},
        {"$set": {f"generated_content.{template}": new_content}},
    )

    # Sync in-memory session
    session_id = record["session_id"]
    session    = get_session(session_id)
    if session:
        session.setdefault("generated_content", {})[template] = new_content
        save_session_to_db(session_id, session)

    return {"updated": True, "template": template}


# ──────────────────────────────────────────────────────────
# Part 3 — Regenerate a single template for a class
# ──────────────────────────────────────────────────────────

@app.post("/class/{class_code}/regenerate")
async def regenerate_template(class_code: str, data: dict):
    """Regenerate a single AI template for a class (teacher-triggered)."""
    template = data.get("template")
    if not template:
        raise HTTPException(status_code=400, detail="template is required")

    class_record = classes_collection.find_one({"class_code": class_code.upper()})
    if not class_record:
        raise HTTPException(status_code=404, detail="Class not found")

    session_id = class_record["session_id"]
    session    = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session expired. Cannot regenerate.")

    unit_input  = session["unit_input"]
    performance = session.get("performance", {})

    # Dispatch to the correct generator
    new_content = None
    if template == "provocation":
        new_content = await generate_provocation(unit_input, performance)
    elif template == "analysis":
        new_content = await generate_analysis(unit_input, performance)
    elif template == "discussion":
        new_content = await generate_discussion(unit_input, performance)
    elif template == "reflection":
        new_content = await generate_reflection(unit_input, "", "", "", "", performance)
    elif template == "ncl_1":
        new_content = await generate_ncl(unit_input, "subtopic 1", performance)
    elif template == "ncl_2":
        new_content = await generate_ncl(unit_input, "subtopic 2", performance)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown template: {template}")

    # Persist to class record in MongoDB
    classes_collection.update_one(
        {"class_code": class_code.upper()},
        {"$set": {f"generated_content.{template}": new_content}},
    )

    # Sync in-memory session and persist session
    session.setdefault("generated_content", {})[template] = new_content
    save_session_to_db(session_id, session)

    print(f"[regenerate] {class_code} / {template} regenerated")
    return {"template": template, "new_content": new_content}
