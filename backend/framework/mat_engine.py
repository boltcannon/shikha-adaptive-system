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
    NCL_REVIEW_PROMPT,
    ANSWER_CHECK_PROMPT,
    DISCUSSION_PROMPT,
    MASTERY_GATE_QUESTION_PROMPT,
    ANALYSIS_PROMPT,
    PROJECT_GUIDANCE_PROMPT,
    REFLECTION_PROMPT,
    FINAL_SUMMARY_PROMPT,
    OPEN_ENDED_CHECK_PROMPT,
    SUBTOPICS_PROMPT,
    RAC_SUGGESTIONS_PROMPT,
    RAC_TEMPLATE_PROMPT,
    RAC_SECTION_FEEDBACK_PROMPT,
    CONTEXT_SUGGESTIONS_PROMPT,
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


async def generate_ncl(
    unit_input, subtopic, performance={},
    student_observation="", student_reflection="",
):
    system_base = build_system_base(unit_input, performance)
    if student_observation:
        student_context = (
            f'\nStudent\'s initial observation from the Provocation:\n'
            f'"{student_observation}"\n\n'
            f'Connect the concept_explanation and real_world_connection back to '
            f'what this student already noticed.\n'
        )
    else:
        student_context = ""
    prompt = NCL_PROMPT.format(
        system_base=system_base,
        subtopic=subtopic,
        student_context=student_context,
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


async def generate_analysis(unit_input, performance={}, weak_subtopics=[]):
    system_base = build_system_base(unit_input, performance)
    prompt = ANALYSIS_PROMPT.format(
        system_base    = system_base,
        chapter        = unit_input.chapter,
        context        = unit_input.context,
        weak_subtopics = ", ".join(weak_subtopics) or "none identified yet",
    )
    return await asyncio.to_thread(call_claude, prompt)


async def generate_ncl_review(
    unit_input,
    weak_subtopics  = [],
    wrong_questions = [],
    performance     = {},
):
    system_base = build_system_base(unit_input, performance)
    prompt = NCL_REVIEW_PROMPT.format(
        system_base     = system_base,
        weak_subtopics  = ", ".join(weak_subtopics) or "general concepts",
        wrong_questions = "\n".join(f"- {q}" for q in wrong_questions[:5]) or "Not specified",
        chapter         = unit_input.chapter,
        context         = unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt, 1500)


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


async def check_open_ended_response(
    unit_input, template, question, student_response, performance={}
):
    """Check an open-ended text response with warm AI feedback."""
    system_base = build_system_base(unit_input, performance)
    prompt = OPEN_ENDED_CHECK_PROMPT.format(
        system_base=system_base,
        template=template,
        question=question,
        student_response=student_response,
        chapter=unit_input.chapter,
        context=unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt, 400)


async def generate_subtopics(unit_input, performance={}):
    """Generate chapter-specific sub-topics for the Mastery Gate."""
    prompt = SUBTOPICS_PROMPT.format(
        grade=unit_input.grade,
        subject=unit_input.subject,
        chapter=unit_input.chapter,
    )
    return await asyncio.to_thread(call_claude, prompt, 500)


async def generate_rac_suggestions(unit_input, mastery_result, performance={}):
    system_base = build_system_base(unit_input, performance)
    strong = []
    weak   = []
    if isinstance(performance, dict):
        for key, val in performance.items():
            if isinstance(val, dict):
                score = val.get("score", 0)
                total = val.get("total", 0)
                if total > 0:
                    if score / total >= 0.7:
                        strong.append(key)
                    else:
                        weak.append(key)
    prompt = RAC_SUGGESTIONS_PROMPT.format(
        system_base      = system_base,
        chapter          = unit_input.chapter,
        context          = unit_input.context,
        mastery_result   = mastery_result or "Not completed",
        strong_subtopics = ", ".join(strong) or "Not assessed",
        weak_subtopics   = ", ".join(weak)   or "Not assessed",
    )
    return await asyncio.to_thread(call_claude, prompt, 1000)


async def generate_rac_template(unit_input, project_idea, performance={}):
    system_base = build_system_base(unit_input, performance)
    prompt = RAC_TEMPLATE_PROMPT.format(
        system_base  = system_base,
        project_idea = project_idea,
        chapter      = unit_input.chapter,
        context      = unit_input.context,
    )
    return await asyncio.to_thread(call_claude, prompt, 2000)


async def get_rac_section_feedback(
    unit_input, project_idea, section_title,
    guiding_question, student_content, performance={}
):
    system_base = build_system_base(unit_input, performance)
    prompt = RAC_SECTION_FEEDBACK_PROMPT.format(
        system_base      = system_base,
        project_idea     = project_idea,
        section_title    = section_title,
        guiding_question = guiding_question,
        student_content  = student_content,
    )
    return await asyncio.to_thread(call_claude, prompt, 400)


async def generate_context_suggestions(grade, subject, chapter):
    prompt = CONTEXT_SUGGESTIONS_PROMPT.format(
        grade=grade,
        subject=subject,
        chapter=chapter,
    )
    return await asyncio.to_thread(call_claude, prompt, 300)


async def generate_reflection(
    unit_input,
    exit_ticket_score=None,
    mastery_gate_result="",
    project_idea="",
    templates_completed="",
    performance={},
    provocation_observation="",
    provocation_reflections=None,
):
    system_base = build_system_base(unit_input, performance)

    # Format exit ticket score with qualitative label
    if exit_ticket_score is not None:
        try:
            score_num = int(exit_ticket_score)
        except (ValueError, TypeError):
            score_num = None
        if score_num is not None:
            if score_num >= 4:
                score_text = f"{score_num}/5 (Excellent)"
            elif score_num >= 2:
                score_text = f"{score_num}/5 (Good effort)"
            else:
                score_text = f"{score_num}/5 (Needs review)"
        else:
            score_text = str(exit_ticket_score)
    else:
        score_text = "Not completed"

    # Format provocation data
    prov_obs_text = provocation_observation or "Not recorded"
    if provocation_reflections:
        refs = [r for r in provocation_reflections if r and str(r).strip()]
        prov_ref_text = "; ".join(refs) if refs else "Not recorded"
    else:
        prov_ref_text = "Not recorded"

    prompt = REFLECTION_PROMPT.format(
        system_base             = system_base,
        exit_ticket_score       = score_text,
        mastery_gate_result     = mastery_gate_result or "Not completed",
        project_idea            = project_idea        or "Not started",
        templates_completed     = templates_completed  or "In progress",
        chapter                 = unit_input.chapter,
        context                 = unit_input.context,
        provocation_observation = prov_obs_text,
        provocation_reflections = prov_ref_text,
    )
    return await asyncio.to_thread(call_claude, prompt, 1200)


async def generate_final_summary(
    unit_input,
    exit_ticket_score=None,
    mastery_gate_result="",
    strong_subtopics=None,
    weak_subtopics=None,
    project_idea="",
    provocation_observation="",
    performance={},
):
    system_base = build_system_base(unit_input, performance)

    if exit_ticket_score is not None:
        try:
            score_text = f"{int(exit_ticket_score)}/5"
        except (ValueError, TypeError):
            score_text = str(exit_ticket_score)
    else:
        score_text = "Not completed"

    prompt = FINAL_SUMMARY_PROMPT.format(
        system_base             = system_base,
        chapter                 = unit_input.chapter,
        context                 = unit_input.context,
        exit_ticket_score       = score_text,
        mastery_gate_result     = mastery_gate_result or "Not completed",
        strong_subtopics        = ", ".join(strong_subtopics or []) or "Not assessed",
        weak_subtopics          = ", ".join(weak_subtopics  or []) or "Not assessed",
        project_idea            = project_idea            or "Not started",
        provocation_observation = provocation_observation or "Not recorded",
    )
    return await asyncio.to_thread(call_claude, prompt, 800)
