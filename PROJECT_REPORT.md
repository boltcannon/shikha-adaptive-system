# Shikha Adaptive Learning Framework
## Project Report

*Version 2.1 — Built June 2026*

---

## 1. What We Built

The Shikha Adaptive Learning Framework is a full AI-powered unit delivery system, not a quiz app. It takes a single teacher input — grade, subject, chapter, and an optional real-world context — and generates an entire learning unit that follows Shikha Academy's MAT (Motivation–Abilities–Transfer) pedagogical sequence. Every piece of content is generated fresh by Claude AI, every answer is checked by AI, every open-ended response receives warm personalised feedback, and every student ends with a reflection that references their own journey. The system runs as a local full-stack application: a React frontend, a FastAPI backend, MongoDB for caching, and Anthropic's Claude Sonnet as the AI engine. The teacher sees a live dashboard tracking each student's progress through all eight templates. The student experiences a coherent, contextualised learning journey — not a set of disconnected exercises.

---

## 2. The Problem It Solves

Traditional classroom education is designed for the average student — which means it fits almost no one. A teacher with 40 students cannot simultaneously deliver motivation-first content to a student who hasn't grasped the prerequisite concept, engaging application problems to a student ready to extend, and creative project work to a student who has achieved mastery. One-size-fits-all instruction creates knowledge gaps that compound: a student who misunderstands integers in Class 6 will struggle with algebra in Class 7, linear equations in Class 8, and coordinate geometry in Class 9. By the time the gap is visible, it has become invisible — because the student has simply stopped engaging.

The Shikha Framework solves this in three ways. First, it makes context mandatory in the pedagogical design — every concept is anchored to the student's world (cricket, cooking, farming, music) so curiosity comes before content. Second, it enforces the MAT sequence — students are motivated before they are taught, practiced before they are tested, and reflected after they have applied. Third, it uses AI to check every answer, coach every open-ended response, and personalise every reflection — something a single teacher with 40 students cannot do alone.

---

## 3. How It Works

The complete student journey:

```
Teacher Input
  └─ Grade + Subject + Chapter + Context (optional)
        │
        ▼
  POST /unit/create  →  session_id created
        │
        ▼
  POST /unit/generate-all  →  AI generates all templates in parallel
  (MongoDB cache checked first — instant load on repeat)
        │
        ▼
  Student works through 8 templates in sequence:
  
  [1] PROVOCATION       →  curiosity before content
  [2] NCL               →  concept taught with context
  [3] ANALYSIS          →  student finds patterns in data
  [4] DISCUSSION        →  no-right-answer debate
  [5] MASTERY GATE      →  pre-generated quiz (must pass to proceed)
  [6] PROJECT PLANNING  →  AI helpline guides project idea
  [7] RAC               →  research, organise, create, present
  [8] REFLECTION        →  personalised celebration + deep questions
        │
        ▼
  Teacher Dashboard
  └─ Progress per template, scores, mastery result, project idea
```

Every MCQ/true-false answer is sent to `POST /check/answer` — Claude reads the student's reasoning and returns warm, specific feedback. Every open-ended textarea (observation, argument, reflection) has a "Get AI Feedback" button that calls `POST /check/open-ended`. The Discussion synthesis section is mandatory — the student cannot proceed until all synthesis questions have at least 20 characters. The Mastery Gate pre-generates 24 questions before the student begins, so there is no waiting between rounds.

---

## 4. The 8 Pedagogical Templates

| # | Template | Purpose | Teacher's AI Role |
|---|----------|---------|-------------------|
| 1 | **Provocation** | Build curiosity and a real-world frame before any teaching. Three scenarios + a Big Question. Students share observations and agree to community norms before continuing. | Co-Explorer — never instructor |
| 2 | **New Content Learning (NCL)** | Teach the concept clearly for the first time. Concept explanation, real-world connection, key facts, and 5 contextualised MCQ/true-false questions. | Instructor |
| 3 | **Analysis** | Students analyse a data artifact (chart, table, list) by answering guiding questions. They find patterns before being told conclusions. AI checks each observation and can give deeper thinking prompts. | Shepherd |
| 4 | **Discussion** | A question with no single correct answer. Students pick from four perspectives shown side by side, write a reasoned argument, and answer synthesis questions (mandatory, minimum 20 chars each). AI checks the argument. | Moderator |
| 5 | **Mastery Gate** | A four-round quiz across the chapter's subtopics. All 24 questions are pre-generated at the start so no waiting between rounds. Subtopic progress pills (green/red) show which topics were mastered. | Gatekeeper |
| 6 | **Project Planning** | An AI "helpline" that guides the student's project idea without doing it for them. Multi-turn conversation. Tracks progress and stores the project idea in session state. | Helpline |
| 7 | **Research & Artifact Creation (RAC)** | A four-step tracker (Research → Organise → Create → Present) with notes per step and a "Mark done" button per stage. Progress bar shown. | Facilitator |
| 8 | **Reflection & Celebration** | A personalised reflection generated using the student's actual scores, mastery result, and project idea. Five deep reflection questions each with a textarea and AI "Reflect deeper" button. | Co-Reflector |

---

## 5. The MAT Framework Alignment

The MAT (Motivation–Abilities–Transfer) framework organises learning into three phases. Every template is designed to sit in one of these phases:

**Motivation Phase — Activate curiosity before content**

| Template | MAT Role |
|----------|----------|
| Provocation | Creates genuine curiosity. The Big Question frames the entire unit. Community norms create psychological safety. No content is delivered until the student is engaged. |

**Abilities Phase — Build Knowledge, then Skills, then Aptitudes**

| Template | MAT Role |
|----------|----------|
| NCL | Builds **Knowledge** (the recall dimension) — what the concept is, what it looks like, key facts. Questions are Knowledge-dimension only. |
| Analysis | Builds **Skills** (the application dimension) — students apply observation to real data. The artifact connects the concept to numbers, patterns, and conclusions. |
| Discussion | Builds **Aptitudes** (the reasoning dimension) — students argue positions using chapter concepts. There is no right answer; quality of reasoning is what counts. |
| Mastery Gate | Checks all three dimensions. Knowledge-level questions (recall) precede Skills-level questions (application). The gate cannot be passed without demonstrating both. |

**Transfer Phase — Apply learning to new contexts**

| Template | MAT Role |
|----------|----------|
| Project Planning | Students transfer knowledge to a self-chosen real-world project. The AI guides without doing. |
| RAC | Students create an artifact that demonstrates transfer — the concept lives in a new form they made. |
| Reflection | Students articulate their own learning journey. Answering "How did you grow?" requires genuine transfer of understanding. |

---

## 6. AI Integration

The system uses Anthropic's Claude Sonnet 4-6 model for all AI tasks. The API is called synchronously via `anthropic.Anthropic().messages.create()` wrapped in `asyncio.to_thread()` to keep FastAPI non-blocking. All calls parse the JSON response, stripping markdown fences if present.

### Unit Generation
When `POST /unit/generate-all` is called, 7 templates are generated in parallel using `asyncio.gather()`. Each call sends a full system prompt containing the grade, subject, chapter, context, context instruction, and performance history. The AI returns structured JSON matching a defined schema for each template type.

### MCQ / True-False Answer Checking (`/check/answer`)
The AI receives the question, the correct answer, the student's answer, the subtopic, dimension, and level. It returns:
- `is_correct` (boolean)
- `feedback` — specific, warm explanation of the student's thinking
- `hint` — if wrong, a guiding nudge without giving away the answer
- `encouragement` — a single motivating line

### Open-Ended Response Checking (`/check/open-ended`)
Called when students write observations, arguments, or reflections. The AI evaluates the response quality (`empty / shallow / good / excellent`) and returns:
- `feedback` — warm, specific acknowledgement of what is good
- `follow_up` — one deeper question to push thinking further
- `encourage_more` — true if the response is too short

Used in: Provocation (observation), Analysis (each guiding question), Discussion (reasoning argument), Reflection (each reflection question).

### Project Guidance (`/guide/project`)
A conversational helpline. The AI receives the project idea, the student's message, and the full conversation history as progress. It returns guidance, a next step, a guiding question, and concepts to apply — never doing the work for the student.

### Personalised Reflection (`/generate/reflection`)
The AI receives the student's actual exit ticket score, mastery gate result, project idea, and list of completed templates. It generates a reflection that references these specifics — the celebration message, journey summary, and reflection questions all adapt to what the student actually did.

### Context-Aware Prompting
Every prompt includes a `context_instruction` field. When a context is provided (e.g., "Cricket"), it instructs the AI to connect ALL examples, scenarios, and questions to that world. When no context is given, it defaults to clear, simple, everyday examples without forcing a theme.

---

## 7. Adaptive Engine

### Session State
Each `POST /unit/create` creates an in-memory session with a UUID. The session stores the unit input, performance history, completed templates list, generated content cache, and mastery questions pool. The session persists for the lifetime of the server process.

### MongoDB Caching
Content generation is expensive (30–60 seconds for a full unit). The system caches all generated content to MongoDB using an MD5 hash of `grade_subject_chapter_context` as the cache key. On a cache hit, the unit loads instantly. Hit counts are tracked. A separate cache key (`{hash}_mastery`) stores the 24 pre-generated Mastery Gate questions.

### Parallel Generation
All templates for a unit are generated in a single `asyncio.gather()` call, running 7 AI requests simultaneously rather than sequentially. A `_safe()` wrapper captures individual failures without crashing the entire batch. Similarly, the 24 Mastery Gate questions are generated in a single `asyncio.gather()` call (24 parallel requests).

### Mastery Gate Pre-Generation
The Mastery Gate screen calls `POST /generate/mastery-all` before showing any questions. This generates 24 questions across 6 subtopics (natural and whole numbers, integers, comparison and ordering, arithmetic operations, properties of numbers, LCM and HCF) in the background while the student sees a "We are almost there..." spinner. Once loaded, all 4 rounds are served from the in-memory pool — no API call waits between questions.

### Per-Round Fallback
If the pre-generated pool is unavailable (e.g., first generation failed), individual calls to `POST /generate/mastery-question` check the session's pre-generated pool first, then fall back to live generation. This ensures the system degrades gracefully.

### Answer State Safety
QuestionCard uses a `useEffect` on the `question` prop reference to reset the `selected` state on every new question. All question objects are spread (`{ ...res }`) before setting state, guaranteeing a new object reference even when two structurally identical questions appear in sequence. This prevents the "stuck options" bug where options became unclickable after the first question.

---

## 8. Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Frontend** | React 18 (create-react-app) | Functional components, hooks, Context API. No CSS framework — all styles are inline `style={{}}` props using the Shikha brand palette (#1A5276 navy, #E87722 orange). |
| **State Management** | React Context API | `UnitContext` holds `sessionId`, `unitInput`, and `performance` (scores, completed templates, project idea). No Redux. |
| **Backend** | FastAPI (Python 3.11+) | Async endpoints, Pydantic models for validation, CORS middleware. Runs via Uvicorn. |
| **AI Model** | Anthropic Claude Sonnet 4-6 | Synchronous `client.messages.create()` wrapped in `asyncio.to_thread()` for non-blocking FastAPI compatibility. Lazy client initialisation after `.env` loads. |
| **Database** | MongoDB (local) | `pymongo` for synchronous operations. One collection (`unit_cache`) stores all generated content and mastery questions. |
| **Chapter Data** | Static JSON (chapters.js) | Complete NCERT curriculum for Classes 1–12 across Mathematics, Science, English, Social Science, Physics, Chemistry, Biology. 836 lines. |
| **Version Control** | Git | 5 commits from initial setup through full feature build and bug-fix audit. |
| **Dev Environment** | Local (Windows) | Backend: `uvicorn main:app --reload` on port 8000. Frontend: `npm start` on port 3000. MongoDB: local instance. `start.bat` launcher starts all three. |

---

## 9. Key Features Built

### Core System
- **Full MAT unit delivery** — 8 pedagogical templates in sequence, each with a distinct AI teacher role
- **Parallel AI generation** — all templates generated simultaneously using `asyncio.gather()`
- **MongoDB caching** — MD5-keyed cache; instant load on repeat generation (cache hit rate tracked)
- **In-memory session store** — UUID sessions persist for the server lifetime with full performance history

### Teacher Input
- **Dynamic NCERT chapter selection** — Grade → Subject → Chapter cascading dropdowns; no free-text typing needed
- **Complete NCERT curriculum** — Classes 1–12, all subjects (Mathematics, Science, English, Social Science, Physics, Chemistry, Biology), ~600 chapters
- **Optional context** — teacher can choose a real-world context (Cricket, Cooking, Space, etc.) or check "No context" for general examples
- **Context suggestion pills** — 10 one-click context presets

### AI Checking
- **MCQ/True-False answer checking** — warm, specific feedback; wrong answers get a hint, never just "incorrect"
- **Open-ended response feedback** — `POST /check/open-ended` endpoint serves Provocation, Analysis, Discussion, and Reflection; quality rated `empty/shallow/good/excellent`; follow-up question pushes thinking deeper
- **Project guidance** — multi-turn conversation that guides without doing; tracks conversation history

### Mastery Gate
- **Pre-generation of 24 questions** — all questions generated before the student begins; no per-round API wait
- **Subtopic progress pills** — 6 pills (Natural Numbers, Integers, Comparison, Operations, Properties, LCM and HCF) update in real-time: orange=current, green=passed, red=failed
- **Score integrity** — `newScore` computed once in `handleAnswer`; never double-counted in `handleNext`
- **Object spread guarantee** — question objects always spread on set, ensuring QuestionCard's `useEffect` fires on every transition

### Discussion
- **Mandatory synthesis** — Continue button disabled until all synthesis questions have ≥20 characters; character counter with green ✓ when threshold met
- **Clickable perspective cards** — 2×2 grid; tap to select; reasoning textarea appears only after selection
- **Synthesis textareas** — one per prompt with individual AI feedback

### UX & Loading
- **SimpleLoader** — standardised "We are almost there..." spinner used across all 8 templates (replaced the rotating-messages LoadingScreen)
- **FeedbackCard `isLast` prop** — final question shows "See My Results →" instead of "Next Question →"
- **Gated community norms** — Begin Learning button disabled until all 5 norms are checked in Provocation
- **Validated empty submissions** — Analysis, ProjectPlanning show inline errors with red borders on empty submit

### Bug Fixes (Full Audit — 10 Fixed)
1. **MasteryGate score double-count** — `newScore` local variable; never adds `feedback.is_correct` in `handleNext`
2. **TeacherDashboard template name mismatch** — `TEMPLATE_KEY_MAP` with full display names (`"Mastery Gate"→"masteryGate"`, `"Project Planning"→"projectPlanning"`, etc.)
3. **Provocation missing textarea and norms** — single `observationText` area after all scenarios; 5 spec-exact norms as boolean array; gate on `allNormsChecked`
4. **Discussion missing interactions** — removed dead `stage` state; 2×2 perspective grid; reasoning textarea gated on position selection
5. **Reflection missing textareas and button** — `answers` state with textarea per reflection question; "View Teacher Report" button
6. **MasteryGate no subtopic pills** — `SUBTOPICS` array; `subtopicStatus` state per subtopic; pills update on `handleNext`
7. **ProjectPlanning silent fail** — `setError()` on empty project idea or message; styled error paragraph shown
8. **FeedbackCard wrong last-question label** — `isLast` prop added; "See My Results →" on final question; passed from NCL and MasteryGate
9. **Analysis no empty-submit validation** — `submitError` state; red border + inline message; clears on re-type
10. **MasteryGate same object reference** — `setQuestion({ ...res })` ensures QuestionCard `useEffect` fires on every transition

---

## 10. API Endpoints

### Unit Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | Health check — returns system name, version, status |
| `POST` | `/unit/create` | Create a new learning session; returns `session_id` |
| `POST` | `/unit/generate-all/{session_id}` | Generate all templates in parallel; cache-aware; returns `source` ("cache"/"generated") |

### Template Generation

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/generate/provocation/{session_id}` | Generate Provocation content (scenarios, big question, observation prompt) |
| `POST` | `/generate/ncl/{session_id}?subtopic=` | Generate NCL content (concept, key facts, 5 questions) for a subtopic |
| `POST` | `/generate/analysis/{session_id}` | Generate Analysis artifact and guiding questions |
| `POST` | `/generate/discussion/{session_id}` | Generate Discussion question, perspectives, synthesis prompts |
| `POST` | `/generate/mastery-all/{session_id}` | Pre-generate all 24 Mastery Gate questions (6 subtopics × 4 levels) |
| `POST` | `/generate/mastery-question/{session_id}?subtopic=&dimension=&level=` | Get one Mastery Gate question (serves from pre-generated pool if available) |
| `POST` | `/generate/reflection/{session_id}?exit_ticket_score=&mastery_gate_result=&project_idea=&templates_completed=` | Generate personalised Reflection using the student's actual performance |

### AI Checking

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/check/answer` | Check MCQ/true-false answer; returns `is_correct`, `feedback`, `hint`, `encouragement` |
| `POST` | `/check/open-ended` | Check open-ended text response; returns `quality`, `feedback`, `follow_up`, `encourage_more` |
| `POST` | `/guide/project` | Multi-turn project helpline; returns `response`, `next_step`, `guiding_question`, `concepts_to_apply` |

### Cache Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/cache/stats` | Total cached units + list with hit counts |
| `DELETE` | `/cache/clear` | Wipe entire MongoDB cache |

---

## 11. What Can Be Added Next

### Student Data Persistence
- Student answers and AI feedback are currently in-memory only — they disappear when the browser closes. Saving sessions to MongoDB would allow resuming mid-unit and building longitudinal learning profiles.

### Multiple Students Per Unit
- The current system assumes one student per session. Adding student identity (name/ID login) and binding multiple sessions to one teacher unit would enable whole-class use — the teacher could see all students' progress in the dashboard simultaneously.

### Teacher Preview Mode
- A "preview as student" mode where the teacher can walk through the generated unit before assigning it to students, with the ability to regenerate individual templates they are unhappy with.

### Streaming Responses
- Currently the frontend waits for the full AI response before displaying. Streaming via Anthropic's streaming API would let students see content appear progressively, reducing perceived wait time from ~30s to near-instant first characters.

### Differentiated Difficulty
- Using the student's performance from NCL and Analysis to dynamically adjust the difficulty of Mastery Gate questions — if the student scored 5/5 in NCL, the Mastery Gate could jump directly to hard questions.

### Rolling Window Rule
- If the student gets 2 incorrect in a row in Mastery Gate, automatically offer a "go back to review" option that re-presents the relevant NCL concept.

### Mobile Application
- The current React app is not mobile-optimised. A React Native version (or a PWA with proper viewport and touch handling) would make the system usable on the phones most Indian students have access to.

### Offline Mode
- Caching generated content in the browser's localStorage or IndexedDB would allow students to work through a pre-generated unit without internet connectivity — important for schools with unreliable connections.

### Teacher Report Export
- Exporting the Teacher Dashboard as a PDF or CSV — per-student scores, per-template completion, open-ended response text — for reporting to school management.

### Multi-Language Support
- The AI is already capable of generating content in regional languages. Adding a language selector to TeacherInput and passing the language to the system prompt would make the framework accessible to non-English-medium schools.

### Cohort Analytics
- Aggregating performance data across multiple students and units to surface chapter-level and class-level gaps — "your Class 8B consistently struggles with the Discussion template for Science chapters" — for teacher professional development.

---

## 12. File Structure

```
D:\Adaptive_system\shikha_framework\
│
├── PROJECT_REPORT.md               ← This document
├── start.bat                       ← GITIGNORED — launches MongoDB + backend + frontend
├── .gitignore                      ← Excludes start.bat, .env, node_modules, build/
│
├── backend\
│   ├── main.py                     ← FastAPI app; all 14 endpoints; session store; MongoDB
│   ├── models.py                   ← Pydantic models: UnitInput, AnswerInput, ProjectMessage
│   ├── requirements.txt            ← fastapi, uvicorn, anthropic, pymongo, pydantic, python-dotenv
│   ├── .env                        ← GITIGNORED — ANTHROPIC_API_KEY, MONGODB_URI
│   │
│   └── framework\
│       ├── __init__.py
│       ├── prompts.py              ← All 9 prompt templates (system base + 8 templates + open-ended check)
│       ├── mat_engine.py           ← Anthropic client, call_claude(), all async generator functions
│       ├── ai_checker.py           ← answer checking utilities
│       └── templates\
│           ├── __init__.py
│           ├── provocation.py
│           ├── ncl.py
│           ├── analysis.py
│           ├── discussion.py
│           ├── mastery_gate.py
│           ├── project_planning.py
│           ├── rac.py
│           └── reflection.py
│
└── frontend\
    ├── package.json                ← React 18, testing-library, react-scripts
    │
    └── src\
        ├── App.js                  ← Root component; screen router; teacher/student mode toggle
        ├── App.css                 ← Global styles: card, dark-card, btn-primary, btn-orange, headings
        ├── index.js                ← React DOM root mount
        │
        ├── api\
        │   └── client.js           ← All 13 API call functions (createUnit, generateAll, checkAnswer, etc.)
        │
        ├── context\
        │   └── UnitContext.js      ← Global state: sessionId, unitInput, performance, completedTemplates
        │
        ├── data\
        │   └── chapters.js         ← Complete NCERT chapter list, Classes 1–12, all subjects (~600 chapters)
        │
        ├── components\
        │   ├── SimpleLoader.js     ← Standardised "We are almost there..." spinner (used everywhere)
        │   ├── LoadingScreen.js    ← Original loading component (retained for compatibility)
        │   ├── TemplateHeader.js   ← Template name + subtitle banner
        │   ├── QuestionCard.js     ← MCQ/true-false card; resets selected state via useEffect on question
        │   ├── FeedbackCard.js     ← Answer feedback card; isLast prop changes final button label
        │   └── OpenEndedFeedback.js ← Reusable AI feedback button + blue feedback box
        │
        ├── screens\
        │   ├── TeacherInput.js     ← Cascading Grade → Subject → Chapter dropdowns; context picker
        │   ├── UnitLoader.js       ← Calls generateAll; "We are almost there..." spinner
        │   └── TeacherDashboard.js ← Progress per template, scores summary; TEMPLATE_KEY_MAP
        │
        └── templates\
            ├── Provocation.js      ← 3 scenarios + observationText + 5 norms + gated Begin button
            ├── NCL.js              ← Concept card + key facts + 5 questions; spread for useEffect safety
            ├── Analysis.js         ← Data artifact + guiding questions; AI feedback per question
            ├── Discussion.js       ← Perspectives 2×2 grid; mandatory synthesis (≥20 chars); AI argument check
            ├── MasteryGate.js      ← Pre-generates 24 questions; subtopic pills; score integrity
            ├── ProjectPlanning.js  ← Multi-turn AI helpline; validation on empty fields
            ├── RAC.js              ← 4-step tracker (Research → Organise → Create → Present)
            └── Reflection.js       ← Personalised reflection; textareas + AI feedback per question
```

---

## Appendix — Prompt Architecture

Every AI call is built from two layers:

**Layer 1 — System Base (injected into every prompt)**
```
SHIKHA_SYSTEM_BASE contains:
- Shikha Academy's core philosophy (6 bullet points)
- 6 core rules for the AI tutor
- Current unit context:
    Grade, Subject, Chapter, Context
    Context instruction (connect to X vs. use general examples)
    Student performance so far (JSON)
```

**Layer 2 — Template-Specific Prompt**
Each template has its own prompt that:
- Declares the template name and teacher role
- States the pedagogical purpose
- Gives specific content requirements
- Defines the exact JSON schema to return
- Forbids any response outside valid JSON

This two-layer architecture means every AI call — whether generating a Provocation or checking a single answer — is fully aware of the student's grade, subject, chapter, context, and performance history. The AI never operates without this context.

---

*Built with FastAPI + React + Anthropic Claude Sonnet 4-6 + MongoDB*
*Shikha Academy MAT Framework implementation — June 2026*
