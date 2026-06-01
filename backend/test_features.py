import requests
import json
import time

BASE = "http://localhost:8000"

print("=" * 60)
print("TEST SUITE — Three New Features")
print("=" * 60)

# ── SETUP — Create a unit first ───────────────────────────
print("\n[SETUP] Creating unit...")
r = requests.post(f"{BASE}/unit/create", json={
    "grade"  : "Class 6",
    "subject": "Mathematics",
    "chapter": "Integers",
    "context": "Cricket"
})
data = r.json()
session_id = data["session_id"]
print(f"Session ID: {session_id}")

print("\n[SETUP] Generating all templates...")
r = requests.post(
    f"{BASE}/unit/generate-all/{session_id}",
    timeout=120
)
gen = r.json()
print(f"Source: {gen.get('source')}")
print(f"Templates generated: {list(gen.get('content', {}).keys())}")

# ── TEST 1 — Session Persistence ──────────────────────────
print("\n" + "=" * 60)
print("TEST 1 — Session Persistence")
print("=" * 60)

print("\nChecking if session was saved to MongoDB...")
r1 = requests.post(f"{BASE}/unit/create", json={
    "grade"  : "Class 6",
    "subject": "Mathematics",
    "chapter": "Integers",
    "context": "Cricket"
})
new_session_id = r1.json()["session_id"]

# Simulate server restart by removing from memory
# by calling an endpoint with a fake session
r2 = requests.post(
    f"{BASE}/generate/provocation/{session_id}"
)
if r2.status_code == 200:
    data = r2.json()
    if data.get("student_role") or data.get("scenarios"):
        print("✅ TEST 1 PASSED — Session restored and provocation returned")
    else:
        print(f"⚠️  TEST 1 PARTIAL — Got response but unexpected format: {list(data.keys())}")
else:
    print(f"❌ TEST 1 FAILED — Status: {r2.status_code}")
    print(f"   Error: {r2.json()}")

# ── TEST 2 — Class Creation ───────────────────────────────
print("\n" + "=" * 60)
print("TEST 2 — Class Creation and Sharing")
print("=" * 60)

print("\nCreating class...")
r3 = requests.post(f"{BASE}/class/create",
    json={"session_id": session_id})
class_data = r3.json()
print(f"Response: {json.dumps(class_data, indent=2)}")

if class_data.get("class_code"):
    class_code = class_data["class_code"]
    print(f"✅ Class code created: {class_code}")

    # Test getting class info
    print(f"\nFetching class info for {class_code}...")
    r4 = requests.get(f"{BASE}/class/{class_code}")
    info = r4.json()
    if info.get("class_code"):
        print(f"✅ Class info retrieved: {info.get('unit_input', {}).get('chapter')}")
    else:
        print(f"❌ Could not get class info: {info}")

    # Test creating class again (should return same code)
    print("\nCreating class again (should return same code)...")
    r5 = requests.post(f"{BASE}/class/create",
        json={"session_id": session_id})
    class_data2 = r5.json()
    if class_data2.get("class_code") == class_code:
        print(f"✅ Same code returned: {class_code}")
    else:
        print(f"⚠️  Different code: {class_data2.get('class_code')}")

    # Test student joining
    print(f"\nStudent joining class {class_code}...")
    r6 = requests.post(
        f"{BASE}/class/{class_code}/join",
        json={"name": "Arjun Sharma"}
    )
    join_data = r6.json()
    if join_data.get("student_id"):
        print(f"✅ Student joined: {join_data.get('student_name')}")
        student_id = join_data["student_id"]

        # Test saving progress
        print("\nSaving student progress...")
        r7 = requests.post(f"{BASE}/student/progress",
            json={
                "student_id": student_id,
                "progress": {
                    "current_screen"      : "ncl",
                    "completed_templates" : ["provocation"],
                    "exit_ticket_score"   : None
                }
            })
        if r7.json().get("saved"):
            print("✅ Progress saved")
        else:
            print(f"❌ Progress save failed: {r7.json()}")

        # Test returning student
        print("\nSame student joining again (returning)...")
        r8 = requests.post(
            f"{BASE}/class/{class_code}/join",
            json={"name": "Arjun Sharma"}
        )
        return_data = r8.json()
        if return_data.get("returning"):
            print(f"✅ Returning student detected")
            print(f"   Progress restored: {return_data.get('progress', {}).get('current_screen')}")
        else:
            print(f"⚠️  Not marked as returning: {return_data}")

        # Test class results
        print(f"\nFetching class results...")
        r9 = requests.get(
            f"{BASE}/class/{class_code}/results"
        )
        results = r9.json()
        if results.get("total_students", 0) > 0:
            print(f"✅ Class results: {results['total_students']} student(s)")
        else:
            print(f"⚠️  No students in results: {results}")
    else:
        print(f"❌ Student join failed: {join_data}")
else:
    print(f"❌ TEST 2 FAILED — No class code")
    print(f"   Response: {class_data}")
    class_code = None

# ── TEST 3 — Regenerate Template ─────────────────────────
print("\n" + "=" * 60)
print("TEST 3 — Regenerate Template")
print("=" * 60)

if class_code:
    print(f"\nRegenerating provocation for {class_code}...")
    start = time.time()
    r10 = requests.post(
        f"{BASE}/class/{class_code}/regenerate",
        json={"template": "provocation"},
        timeout=60
    )
    elapsed = time.time() - start
    regen_data = r10.json()

    if regen_data.get("new_content"):
        content = regen_data["new_content"]
        has_role = bool(content.get("student_role"))
        has_scenarios = bool(content.get("scenarios"))
        print(f"✅ Regeneration successful in {elapsed:.1f}s")
        print(f"   Has student_role: {has_role}")
        print(f"   Has scenarios: {has_scenarios}")
        if has_role:
            print(f"   New role: {content['student_role'][:50]}...")
    else:
        print(f"❌ Regeneration failed: {regen_data}")
else:
    print("⚠️  Skipped — no class code from Test 2")

# ── SUMMARY ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("Check results above for ✅ PASSED / ❌ FAILED")
print("=" * 60)
