import anthropic
import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from .prompts import (
    SHIKHA_SYSTEM_BASE,
    PROVOCATION_PROMPT,
    NCL_PROMPT,
    ANSWER_CHECK_PROMPT,
    DISCUSSION_PROMPT,
    MASTERY_GATE_QUESTION_PROMPT,
    ANALYSIS_PROMPT,
    PROJECT_GUIDANCE_PROMPT,
    REFLECTION_PROMPT,
)

# Load .env from the backend directory (two levels up from this file)
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=True)

# Lazy client — resolved after .env is loaded
_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. "
                f"Add it to {_ENV_PATH}"
            )
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def build_system_base(unit_input, performance={}):
    context = unit_input.context or "general"

    if context in ("general", ""):
        context_instruction = (
            "Use clear, simple, everyday examples "
            "that any student can relate to. "
            "Do not force a specific theme."
        )
    else:
        context_instruction = (
            f"Connect ALL examples, scenarios and "
            f"questions to {context}. Every problem "
            f"must feel like it belongs in this world."
        )

    return SHIKHA_SYSTEM_BASE.format(
        grade=unit_input.grade,
        subject=unit_input.subject,
        chapter=unit_input.chapter,
        context=context,
        context_instruction=context_instruction,
        performance=json.dumps(performance),
    )


def call_claude(prompt, max_tokens=2000):
    response = get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text
    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


async def generate_provocation(unit_input, performance={}):
    system_base = build_system_base(unit_input, performance)
    prompt = PROVOCATION_PROMPT.format(system_base=system_base)
    return await asyncio.to_thread(call_claude, prompt)


async def generate_ncl(unit_input, subtopic, performance={}):
    system_base = build_system_base(unit_input, performance)
    prompt = NCL_PROMPT.format(
        system_base=system_base,
        subtopic=subtopic,
    )
    return await asyncio.to_thread(call_claude, prompt, 3000)


async def check_answer(
    unit_input,
    question,
    correct_answer,
    student_answer,
    subtopic,
    dimension,
    level,
    performance={},
):
    system_base = build_system_base(unit_input, performance)
    prompt = ANSWER_CHECK_PROMPT.format(
        system_base=system_base,
        question=question,
        correct_answer=correct_answer,
        student_answer=student_answer,
        subtopic=subtopic,
        dimension=dimension,
        level=level,
    )
    return await asyncio.to_thread(call_claude, prompt, 500)


async def generate_discussion(unit_input, performance={}):
    system_base = build_system_base(unit_input, performance)
    prompt = DISCUSSION_PROMPT.format(
        system_base=system_base,
        chapter=unit_input.chapter,
        context=unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt)


async def generate_mastery_question(
    unit_input, subtopic, dimension, level, performance={}
):
    system_base = build_system_base(unit_input, performance)
    prompt = MASTERY_GATE_QUESTION_PROMPT.format(
        system_base=system_base,
        subtopic=subtopic,
        dimension=dimension,
        level=level,
        context=unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt)


async def generate_analysis(unit_input, performance={}):
    system_base = build_system_base(unit_input, performance)
    prompt = ANALYSIS_PROMPT.format(
        system_base=system_base,
        chapter=unit_input.chapter,
        context=unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt)


async def guide_project(
    unit_input, project_idea, message, progress, performance={}
):
    system_base = build_system_base(unit_input, performance)
    prompt = PROJECT_GUIDANCE_PROMPT.format(
        system_base=system_base,
        project_idea=project_idea,
        chapter=unit_input.chapter,
        context=unit_input.context,
        progress=progress,
        message=message,
    )
    return await asyncio.to_thread(call_claude, prompt)


async def generate_reflection(
    unit_input,
    exit_ticket_score,
    mastery_gate_result,
    project_idea,
    templates_completed,
    performance={},
):
    system_base = build_system_base(unit_input, performance)
    prompt = REFLECTION_PROMPT.format(
        system_base=system_base,
        exit_ticket_score=exit_ticket_score,
        mastery_gate_result=mastery_gate_result,
        project_idea=project_idea,
        templates_completed=templates_completed,
        chapter=unit_input.chapter,
        context=unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt)
