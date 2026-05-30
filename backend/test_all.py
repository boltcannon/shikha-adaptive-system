import requests
import json

BASE = "http://localhost:8000"

# Use existing session
session_id = "27d52e3a-4b70-423c-9b3e-b141dfb0dca5"

print("=" * 50)
print("TEST 1 - DISCUSSION GENERATION")
print("=" * 50)
r = requests.post(
    f"{BASE}/generate/discussion/{session_id}",
    timeout=60
)
print(json.dumps(r.json(), indent=2))

print("\n" + "=" * 50)
print("TEST 2 - ANALYSIS GENERATION")
print("=" * 50)
r = requests.post(
    f"{BASE}/generate/analysis/{session_id}",
    timeout=60
)
print(json.dumps(r.json(), indent=2))

print("\n" + "=" * 50)
print("TEST 3 - MASTERY GATE QUESTION")
print("=" * 50)
r = requests.post(
    f"{BASE}/generate/mastery-question/{session_id}",
    params={
        "subtopic": "integers",
        "dimension": "skills",
        "level": "hard"
    },
    timeout=60
)
print(json.dumps(r.json(), indent=2))

print("\n" + "=" * 50)
print("TEST 4 - PROJECT GUIDANCE")
print("=" * 50)
r = requests.post(
    f"{BASE}/guide/project",
    json={
        "session_id": session_id,
        "project_idea": "I want to make a poster showing how integers are used in cricket scoring",
        "message": "I am not sure where to start. Should I use the net run rate or the individual scores?",
        "progress": ""
    },
    timeout=60
)
print(json.dumps(r.json(), indent=2))

print("\n" + "=" * 50)
print("TEST 5 - REFLECTION GENERATION")
print("=" * 50)
r = requests.post(
    f"{BASE}/generate/reflection/{session_id}",
    params={
        "exit_ticket_score": "4 out of 5",
        "mastery_gate_result": "4 of 6 subtopics mastered",
        "project_idea": "poster showing integers in cricket scoring",
        "templates_completed": "Provocation, NCL, Analysis, Discussion, Mastery Gate, Project Planning, RAC"
    },
    timeout=60
)
print(json.dumps(r.json(), indent=2))
