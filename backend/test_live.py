import requests
import json

BASE = "https://shikha-adaptive-system.onrender.com"

print("Testing live backend...")
print(f"URL: {BASE}")

# Test 1 - Health check
print("\n[1] Health check...")
r = requests.get(BASE, timeout=30)
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")

# Test 2 - Create unit
print("\n[2] Creating unit...")
r2 = requests.post(
    f"{BASE}/unit/create",
    json={
        "grade"  : "Class 6",
        "subject": "Mathematics",
        "chapter": "Integers",
        "context": "Cricket"
    },
    timeout=30
)
print(f"Status: {r2.status_code}")
print(f"Response: {r2.json()}")

if r2.status_code == 200:
    session_id = r2.json()["session_id"]

    # Test 3 - Generate all
    print(f"\n[3] Generating all templates...")
    print("This may take 30-60 seconds...")
    r3 = requests.post(
        f"{BASE}/unit/generate-all/{session_id}",
        timeout=120
    )
    print(f"Status: {r3.status_code}")
    if r3.status_code == 200:
        data = r3.json()
        print(f"Source: {data.get('source')}")
        print(f"Templates: {list(data.get('content', {}).keys())}")
        print("PASSED - Generate all working")
    else:
        print(f"FAILED - Generate all")
        print(f"Response: {r3.text[:500]}")
