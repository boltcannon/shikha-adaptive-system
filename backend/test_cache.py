import requests
import json
import time

BASE = "http://localhost:8000"

print("=" * 55)
print("TEST 1 - First generation (cache miss)")
print("=" * 55)
start = time.time()

r1 = requests.post(f"{BASE}/unit/create", json={
    "grade": "Class 6",
    "subject": "Mathematics",
    "chapter": "Number System",
    "context": "Cricket"
})
session_id = r1.json()["session_id"]
print(f"Session: {session_id}")

r2 = requests.post(f"{BASE}/unit/generate-all/{session_id}", timeout=120)
elapsed1 = time.time() - start
data1 = r2.json()

print(f"Source  : {data1['source']}")
print(f"Message : {data1['message']}")
print(f"Time    : {elapsed1:.1f} seconds")
print(f"Keys    : {list(data1['content'].keys())}")


print("\n" + "=" * 55)
print("TEST 2 - Same inputs (cache hit)")
print("=" * 55)
start = time.time()

r3 = requests.post(f"{BASE}/unit/create", json={
    "grade": "Class 6",
    "subject": "Mathematics",
    "chapter": "Number System",
    "context": "Cricket"
})
session_id_2 = r3.json()["session_id"]
print(f"Session: {session_id_2}")

r4 = requests.post(f"{BASE}/unit/generate-all/{session_id_2}", timeout=10)
elapsed2 = time.time() - start
data2 = r4.json()

print(f"Source  : {data2['source']}")
print(f"Message : {data2['message']}")
print(f"Time    : {elapsed2:.2f} seconds")

print("\n" + "=" * 55)
print("RESULT")
print("=" * 55)
if elapsed2 > 0:
    print(f"Cache miss  : {elapsed1:.1f}s")
    print(f"Cache hit   : {elapsed2:.2f}s")
    print(f"Speedup     : {elapsed1/elapsed2:.0f}x faster")

print("\n" + "=" * 55)
print("CACHE STATS")
print("=" * 55)
r5 = requests.get(f"{BASE}/cache/stats")
stats = r5.json()
print(f"Total cached units: {stats['total_cached_units']}")
for u in stats["units"]:
    print(f"\n  {u['grade']} | {u['subject']} | {u['chapter']} | {u['context']}")
    print(f"  cache_key : {u['cache_key']}")
    print(f"  hit_count : {u['hit_count']}")
    print(f"  created   : {u.get('created_at', 'N/A')}")
