import requests
import json

BASE = "http://localhost:8000"

print("TEST — No context unit generation")
print("=" * 50)

r1 = requests.post(f"{BASE}/unit/create", json={
    "grade": "Class 6",
    "subject": "Mathematics",
    "chapter": "Number System",
    "context": "general"
})
session_id = r1.json()["session_id"]
print(f"Session: {session_id}")
print("Generating provocation (no context)...\n")

r2 = requests.post(
    f"{BASE}/generate/provocation/{session_id}",
    timeout=60
)
print(json.dumps(r2.json(), indent=2))
