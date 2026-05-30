# AI Checker — validates and sanitises Claude JSON responses
# Used by mat_engine.call_claude() before returning to routes

import json


def strip_fences(text: str) -> str:
    """Remove markdown code fences from Claude output."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


def safe_parse(text: str) -> dict:
    """Parse JSON with a clean error message."""
    cleaned = strip_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Claude returned invalid JSON: {e}\nRaw text: {cleaned[:300]}"
        )


def validate_keys(data: dict, required_keys: list) -> bool:
    """Check that all required top-level keys are present."""
    missing = [k for k in required_keys if k not in data]
    if missing:
        raise ValueError(f"Missing keys in Claude response: {missing}")
    return True
