import requests
import json

# Auto-create a fresh session so this script is self-contained
# (no dependency on a hardcoded session_id from a previous run)
print("Creating session...")
session_resp = requests.post(
    "http://localhost:8000/unit/create",
    json={
        "grade": "Class 6",
        "subject": "Mathematics",
        "chapter": "Number System",
        "context": "Cricket"
    },
    timeout=15
)
session_id = session_resp.json()["session_id"]
print(f"Session ID: {session_id}\n")

# Test 1 - Wrong answer
print("Testing WRONG answer...")
r1 = requests.post(
    "http://localhost:8000/check/answer",
    json={
        "session_id": session_id,
        "question": "A cricket team needs 50 more runs to win. Which integer represents this deficit?",
        "correct_answer": "-50",
        "student_answer": "50",
        "subtopic": "integers",
        "dimension": "knowledge",
        "level": "medium"
    },
    timeout=60
)
print("WRONG ANSWER FEEDBACK:")
print(json.dumps(r1.json(), indent=2))

print("\n")

# Test 2 - Correct answer
print("Testing CORRECT answer...")
r2 = requests.post(
    "http://localhost:8000/check/answer",
    json={
        "session_id": session_id,
        "question": "India scored 245 runs. Which type of integer is this?",
        "correct_answer": "A positive integer",
        "student_answer": "A positive integer",
        "subtopic": "integers",
        "dimension": "knowledge",
        "level": "easy"
    },
    timeout=60
)
print("CORRECT ANSWER FEEDBACK:")
print(json.dumps(r2.json(), indent=2))
