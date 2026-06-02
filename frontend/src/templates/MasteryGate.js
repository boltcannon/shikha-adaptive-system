import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"
import QuestionCard from "../components/QuestionCard"
import FeedbackCard from "../components/FeedbackCard"

// Dimension / level progression — same 4-round sequence regardless of chapter
const DIM_SEQ = ["knowledge", "knowledge", "skills",  "skills"]
const LVL_SEQ = ["easy",      "medium",    "medium",  "hard"  ]

// Fallback subtopics when the API fails to return them
const FALLBACK_SUBTOPICS = [
  { key: "core_concepts",   label: "Core Concepts"   },
  { key: "key_rules",       label: "Key Rules"       },
  { key: "applications",    label: "Applications"    },
  { key: "problem_solving", label: "Problem Solving" },
]

/**
 * Convert a list of {key, label} subtopics into 4 mastery rounds.
 * Uses the first 4 subtopics; dimension/level follow DIM_SEQ/LVL_SEQ.
 */
function buildRounds(subtopics) {
  return subtopics.slice(0, 4).map((st, i) => ({
    subtopic : st.key,           // used as dict key for question lookup
    label    : st.label,         // shown in UI
    dimension: DIM_SEQ[i],
    level    : LVL_SEQ[i],
  }))
}

const PILL_STYLE = {
  padding: "4px 10px",
  borderRadius: "16px",
  fontSize: "11px",
  fontWeight: "bold",
  fontFamily: "Arial",
}

function pillColors(status) {
  if (status === "passed")  return { background: "#D5F5E3", color: "#1E8449" }
  if (status === "failed")  return { background: "#FADBD8", color: "#C0392B" }
  if (status === "current") return { background: "#FEF9E7", color: "#E87722" }
  return { background: "#F2F3F4", color: "#BDC3C7" }
}

/**
 * Pull one question out of the pre-generated pool.
 * Backend key = subtopic with spaces replaced by underscores.
 * DIM_SEQ/LVL_SEQ slot: knowledge[easy→0, medium→1], skills[medium→0, hard→1]
 */
function pickQuestion(pregen, subtopicKey, dimension, level) {
  const qs = pregen?.[subtopicKey]?.[dimension] || []
  const idx = (level === "easy" || (dimension === "skills" && level === "medium")) ? 0 : 1
  return qs[idx] || qs[0] || null
}

export default function MasteryGate({ onNavigate }) {
  const { sessionId, addCompletedTemplate, updatePerformance, saveStudentProgress } = useUnit()

  // Dynamic chapter subtopics
  const [subtopics,       setSubtopics]       = useState([])
  const [masteryRounds,   setMasteryRounds]   = useState([])
  const [subtopicStatus,  setSubtopicStatus]  = useState({})

  // Pre-generation
  const [masteryReady,         setMasteryReady]         = useState(false)
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState(null)

  // Per-round
  const [question,  setQuestion]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [feedback,  setFeedback]  = useState(null)
  const [checking,  setChecking]  = useState(false)
  const [round,     setRound]     = useState(0)
  const [score,     setScore]     = useState(0)
  const [done,      setDone]      = useState(false)

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    initMastery()
  }, [sessionId]) // eslint-disable-line

  const initMastery = async () => {
    // ── 1. Get chapter-specific sub-topics ───────────────
    let dynamicSubs = []
    try {
      const res = await api.generateSubtopics(sessionId)
      if (res.subtopics?.length) dynamicSubs = res.subtopics
    } catch (e) {
      console.warn("generateSubtopics failed, using fallback:", e)
    }
    if (!dynamicSubs.length) dynamicSubs = FALLBACK_SUBTOPICS

    const rounds = buildRounds(dynamicSubs)

    // Build pill status keyed by subtopic.key
    const initStatus = {}
    dynamicSubs.forEach((st, i) => {
      initStatus[st.key] = i === 0 ? "current" : "pending"
    })

    setSubtopics(dynamicSubs)
    setMasteryRounds(rounds)
    setSubtopicStatus(initStatus)

    // ── 2. Pre-generate mastery questions ─────────────────
    let pregen = null
    try {
      const result = await api.generateMasteryAll(sessionId)
      if (result.questions) {
        pregen = result.questions
        setPreGeneratedQuestions(pregen)
      }
    } catch (e) {
      console.warn("generateMasteryAll failed:", e)
    }

    setMasteryReady(true)
    // Pass rounds directly — avoids React state-flush timing issue
    loadQuestion(0, pregen, rounds)
  }

  /**
   * Load question for round r.
   * `pregen`  — passed explicitly at init time; falls back to state thereafter
   * `rounds`  — passed explicitly at init time; falls back to state thereafter
   */
  const loadQuestion = (r, pregen = null, rounds = null) => {
    const activeRounds = rounds ?? masteryRounds
    if (!activeRounds[r]) return
    const { subtopic, dimension, level } = activeRounds[r]
    setFeedback(null)

    const pool = pregen ?? preGeneratedQuestions
    if (pool) {
      const q = pickQuestion(pool, subtopic, dimension, level)
      if (q) { setQuestion({ ...q }); setLoading(false); return }
    }

    // Fallback: individual API call (subtopic key → human-readable for Claude)
    setLoading(true)
    api.generateMasteryQuestion(sessionId, subtopic.replace(/_/g, " "), dimension, level)
      .then(res => { setQuestion({ ...res }); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const handleAnswer = async (option) => {
    if (!question) return
    setChecking(true)
    const { subtopic, dimension, level } = masteryRounds[round]
    const result = await api.checkAnswer(
      sessionId, question.text, question.correct_answer,
      option,
      subtopic.replace(/_/g, " "),  // human-readable for Claude context
      dimension, level
    )
    const newScore = result.is_correct ? score + 1 : score
    setScore(newScore)
    setFeedback(result)
    setChecking(false)
  }

  const handleNext = () => {
    const nextRound   = round + 1
    const currentKey  = masteryRounds[round]?.subtopic
    const nextKey     = masteryRounds[nextRound]?.subtopic

    setSubtopicStatus(prev => ({
      ...prev,
      ...(currentKey ? { [currentKey]: feedback?.is_correct ? "passed" : "failed" } : {}),
      ...(nextKey && nextRound < masteryRounds.length ? { [nextKey]: "current" } : {}),
    }))

    if (nextRound >= masteryRounds.length) {
      const result = `${score} / ${masteryRounds.length}`
      updatePerformance("masteryGateResult", result)
      setDone(true)
    } else {
      setRound(nextRound)
      loadQuestion(nextRound)
    }
  }

  const handleContinue = () => {
    addCompletedTemplate("masteryGate")
    saveStudentProgress({
      current_screen     : "projectPlanning",
      mastery_gate_result: `${score} / ${masteryRounds.length}`,
    })
    onNavigate("projectPlanning")
  }

  // ── Loading screen while sub-topics + questions generate ──
  if (!masteryReady) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "60vh", gap: "24px",
      }}>
        <div style={{
          width: "56px", height: "56px",
          border: "4px solid #F2F3F4",
          borderTop: "4px solid #E87722",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <p style={{ fontSize: "16px", color: "#5D6D7E", fontFamily: "Arial" }}>
          Preparing your mastery challenge...
        </p>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (loading) return <SimpleLoader />

  // ── Results screen ──────────────────────────────────────
  if (done) {
    const total  = masteryRounds.length
    const passed = score >= Math.ceil(total * 0.75)
    return (
      <div>
        <TemplateHeader template="MASTERY GATE" subtitle="Complete" />
        <div className="dark-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "48px", marginBottom: "8px" }}>{passed ? "🏆" : "📚"}</p>
          <h2 style={{ color: "white", fontFamily: "Arial", fontSize: "24px", marginBottom: "8px" }}>
            {score} / {total}
          </h2>
          <p style={{ color: passed ? "#58D68D" : "#F1948A", fontFamily: "Arial", fontSize: "16px" }}>
            {passed ? "Mastery Achieved!" : "Keep practising — you're getting there!"}
          </p>
        </div>
        <button className="btn-primary" onClick={handleContinue}
          style={{ width: "100%", padding: "14px", marginTop: "16px" }}>
          Continue to Project Planning →
        </button>
      </div>
    )
  }

  // ── Main question screen ────────────────────────────────
  return (
    <div>
      <TemplateHeader
        template="MASTERY GATE"
        subtitle={`Round ${round + 1} of ${masteryRounds.length}`}
      />

      {/* Dynamic chapter sub-topic pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {subtopics.map(st => (
          <span key={st.key} style={{ ...PILL_STYLE, ...pillColors(subtopicStatus[st.key]) }}>
            {st.label}
          </span>
        ))}
      </div>

      <div className="card" style={{ background: "#1A5276", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <p style={{ color: "white", fontFamily: "Arial", fontSize: "13px" }}>
            {masteryRounds[round]?.label} ·&nbsp;
            <strong>{masteryRounds[round]?.level?.toUpperCase()}</strong>
          </p>
          <p style={{ color: "#E87722", fontFamily: "Arial", fontSize: "13px", fontWeight: "bold" }}>
            Score: {score}/{round}
          </p>
        </div>
      </div>

      {question && (
        <QuestionCard question={question} onAnswer={handleAnswer} loading={checking} />
      )}

      {feedback && (
        <FeedbackCard
          feedback={feedback}
          onNext={handleNext}
          isLast={round === masteryRounds.length - 1}
        />
      )}
    </div>
  )
}
