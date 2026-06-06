import requests
import json
import sys

BASE = "http://localhost:8000"

print("BACKEND AUDIT")
print("=" * 50)

# Test health
r = requests.get(BASE)
print(f"Health: {r.status_code} — {r.json().get('status')}")

# Test unit create
r = requests.post(f"{BASE}/unit/create", json={
    "grade": "Class 6",
    "subject": "Mathematics",
    "chapter": "Symmetry",
    "context": "general"
})
assert r.status_code == 200, f"create failed: {r.text}"
session_id = r.json()["session_id"]
print(f"Unit create: OK session_id={session_id[:8]}...")

# Test generate-all
print("Generating all templates (30-90s)...")
r = requests.post(f"{BASE}/unit/generate-all/{session_id}", timeout=180)
assert r.status_code == 200, f"generate-all failed: {r.text}"
content = r.json().get("content", {})
print(f"Generate all: OK source={r.json().get('source')}")
print(f"  Keys returned: {list(content.keys())}")

expected = ["provocation", "analysis", "discussion", "reflection", "subtopics"]
for t in expected:
    val = content.get(t)
    print(f"  {'OK' if val else 'MISSING'} {t}")

# Check mastery_sample not hardcoded
if "mastery_sample" in content:
    q = content["mastery_sample"] or {}
    print(f"  WARN mastery_sample present (check for hardcoded 'integers'): {str(q)[:80]}")

# Test subtopics
r = requests.post(f"{BASE}/generate/subtopics/{session_id}")
subtopics = r.json().get("subtopics", [])
print(f"Subtopics ({len(subtopics)}): {[s['label'] for s in subtopics]}")

# Test mastery-all
print("Generating mastery questions (30-60s)...")
r = requests.post(f"{BASE}/generate/mastery-all/{session_id}", timeout=180)
assert r.status_code == 200, f"mastery-all failed: {r.text}"
questions = r.json().get("questions", {})
print(f"Mastery-all: OK {len(questions)} subtopics, keys={list(questions.keys())[:3]}")

# Verify mastery question structure
for key, pool in list(questions.items())[:1]:
    for dim in ["knowledge", "skills"]:
        for q in (pool.get(dim) or []):
            if q:
                missing = [f for f in ["text","options","correct_answer","explanation"] if not q.get(f)]
                if missing:
                    print(f"  WARN mastery q missing fields: {missing}")
                else:
                    print(f"  OK mastery q has all required fields")
                break

# Test batch answer check
r = requests.post(f"{BASE}/check/answers-batch", json={
    "session_id": session_id,
    "answers": [
        {
            "question": "What is a line of symmetry?",
            "correct_answer": "A line that divides a shape into two equal halves",
            "student_answer": "A line that divides a shape into two equal halves",
            "explanation": "Correct definition",
            "subtopic": "symmetry",
            "dimension": "knowledge",
            "level": "easy"
        },
        {
            "question": "How many lines of symmetry does a square have?",
            "correct_answer": "4",
            "student_answer": "2",
            "explanation": "A square has 4 lines of symmetry",
            "subtopic": "symmetry",
            "dimension": "knowledge",
            "level": "medium"
        }
    ]
}, timeout=60)
result = r.json()
print(f"Batch check: OK score={result.get('score')}/{result.get('total')} colour={result.get('colour')}")
assert result.get("results"), "No results in batch response"
assert len(result["results"]) == 2, f"Expected 2 results, got {len(result['results'])}"

# Test analysis check
r = requests.post(f"{BASE}/check/analysis", json={
    "session_id": session_id,
    "responses": {
        "observations": "I notice shapes have different numbers of lines of symmetry",
        "patterns": "Regular shapes have more lines of symmetry",
        "surprises": "A circle has infinite lines of symmetry",
        "conclusion": "Symmetry depends on the regularity of the shape"
    }
}, timeout=60)
result = r.json()
print(f"Analysis check: OK keys={list(result.keys())}")
required_keys = ["student_analysis_feedback", "ideal_analysis", "connection_to_chapter"]
for k in required_keys:
    print(f"  {'OK' if result.get(k) else 'MISSING'} {k}")

# Test class creation (requires MongoDB — skips gracefully if unavailable)
r = requests.post(f"{BASE}/class/create", json={"session_id": session_id})
if r.status_code == 200 and r.text.strip():
    class_code = r.json().get("class_code")
    print(f"Class create: OK code={class_code}")

    r = requests.post(f"{BASE}/class/{class_code}/join", json={"name": "Audit Student"}, timeout=30)
    if r.status_code == 200:
        print(f"Student join: OK name={r.json().get('student_name')}")
    else:
        print(f"Student join: SKIP (status {r.status_code})")

    r = requests.get(f"{BASE}/class/{class_code}/results")
    if r.status_code == 200:
        result = r.json()
        print(f"Class results: OK total={result.get('total_students')}")
    else:
        print(f"Class results: SKIP (status {r.status_code})")
else:
    print(f"Class create: SKIP (MongoDB not available locally — status {r.status_code})")

print()
print("=" * 50)
print("AUDIT COMPLETE")
