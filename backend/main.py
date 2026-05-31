import asyncio
import datetime
import hashlib
import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

from framework.mat_engine import (
    check_answer,
    check_open_ended_response,
    generate_analysis,
    generate_discussion,
    generate_mastery_question,
    generate_ncl,
    generate_provocation,
    generate_reflection,
    guide_project,
)
from models import AnswerInput, ProjectMessage, UnitInput

# ── Environment ───────────────────────────────────────────
load_dotenv()

# ── MongoDB ───────────────────────────────────────────────
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client["shikha_framework"]
cache_collection = db["unit_cache"]
sessions_collection = db["sessions"]

# ── FastAPI app ───────────────────────────────────────────
app = FastAPI(
    title="Shikha Adaptive Learning Framework",
    description="AI-powered unit generation using MAT framework",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory session store ───────────────────────────────
sessions = {}


# ── Helpers ───────────────────────────────────────────────
def make_cache_key(unit_input: UnitInput) -> str:
    raw = (
        f"{unit_input.grade}_{unit_input.subject}"
        f"_{unit_input.chapter}_{unit_input.context}"
    )
    return hashlib.md5(raw.lower().encode()).hexdigest()


def _get_session(session_id: str) -> dict:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


# ──────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "system": "Shikha Adaptive Learning Framework",
        "version": "2.1",
        "status": "running",
    }


# ──────────────────────────────────────────────────────────
# Unit creation
# ──────────────────────────────────────────────────────────
@app.post("/unit/create")
async def create_unit(unit_input: UnitInput):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "unit_input": unit_input,
        "performance": {},
        "current_template": "provocation",
        "completed_templates": [],
        "generated_content": {},
    }
    return {"session_id": session_id, "message": "Unit created successfully"}


# ──────────────────────────────────────────────────────────
# Generate ALL templates at once (with MongoDB cache)
# ──────────────────────────────────────────────────────────
@app.post("/unit/generate-all/{session_id}")
async def generate_all_templates(session_id: str):
    session = _get_session(session_id)
    unit_input = session["unit_input"]
    cache_key = make_cache_key(unit_input)

    # ── Cache HIT ─────────────────────────────────────────
    cached = cache_collection.find_one({"cache_key": cache_key})
    if cached:
        print(f"Cache HIT  : {cache_key}")
        cache_collection.update_one(
            {"cache_key": cache_key},
            {"$inc": {"hit_count": 1}}
        )
        session["generated_content"] = cached["content"]
        return {
            "source": "cache",
            "message": "Loaded from cache instantly",
            "content": cached["content"],
        }

    # ── Cache MISS — generate in parallel ─────────────────
    print(f"Cache MISS : {cache_key} - generating...")

    results = await asyncio.gather(
        generate_provocation(unit_input, session["performance"]),
        generate_ncl(unit_input, "subtopic 1", session["performance"]),
        generate_ncl(unit_input, "subtopic 2", session["performance"]),
        generate_analysis(unit_input, session["performance"]),
        generate_discussion(unit_input, session["performance"]),
        generate_mastery_question(
            unit_input, "integers", "knowledge", "medium",
            session["performance"]
        ),
        generate_reflection(
            unit_input, "", "", "", "", session["performance"]
        ),
        return_exceptions=True,
    )

    def _safe(r):
        return r if not isinstance(r, Exception) else None

    content = {
        "provocation":    _safe(results[0]),
        "ncl_1":          _safe(results[1]),
        "ncl_2":          _safe(results[2]),
        "analysis":       _safe(results[3]),
        "discussion":     _safe(results[4]),
        "mastery_sample": _safe(results[5]),
        "reflection":     _safe(results[6]),
    }

    # Log any generation errors without crashing
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"  ⚠  result[{i}] failed: {r}")

    # ── Persist to MongoDB ────────────────────────────────
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

    session["generated_content"] = content
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


@app.post("/check/open-ended")
async def check_open_ended(data: dict):
    """AI feedback on any open-ended student response (provocation, analysis, discussion, reflection)."""
    session_id = data.get("session_id", "")
    session = _get_session(session_id)
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


@app.post("/generate/mastery-question/{session_id}")
async def get_mastery_question(
    session_id: str, subtopic: str, dimension: str, level: str
):
    session = _get_session(session_id)
    # Mastery questions vary by subtopic/level — always fresh
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
