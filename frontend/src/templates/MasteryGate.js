import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import LoadingScreen from "../components/LoadingScreen"
import TemplateHeader from "../components/TemplateHeader"
import QuestionCard from "../components/QuestionCard"
import FeedbackCard from "../components/FeedbackCard"

const MASTERY_ROUNDS = [
  { subtopic: "core concepts", dimension: "knowledge", level: "easy" },
  { subtopic: "core concepts", dimension: "knowledge", level: "medium" },
  { subtopic: "application",   dimension: "skills",    level: "medium" },
  { subtopic: "application",   dimension: "skills",    level: "hard" },
]

// Bug 6 — subtopic progress pills (spec-defined labels)
const SUBTOPICS = [
  { key: "natural",    label: "Natural Numbers" },
  { key: "integers",   label: "Integers" },
  { key: "comparison", label: "Comparison" },
  { key: "arithmetic", label: "Operations" },
  { key: "properties", label: "Properties" },
  { key: "lcm",        label: "LCM and HCF" }
]

const PILL_STYLE = {
  padding: "4px 10px",
  borderRadius: "16px",
  fontSize: "11px",
  fontWeight: "bold",
  fontFamily: "Arial"
}

function pillColors(status) {
  if (status === "passed")  return { background: "#D5F5E3", color: "#1E8449" }
  if (status === "failed")  return { background: "#FADBD8", color: "#C0392B" }
  if (status === "current") return { background: "#FEF9E7", color: "#E87722" }
  return { background: "#F2F3F4", color: "#BDC3C7" }
}

export default function MasteryGate({ onNavigate }) {
  const { sessionId, addCompletedTemplate, updatePerformance } = useUnit()
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [checking, setChecking] = useState(false)
  const [round, setRound] = useState(0)
  // Bug 1 — score is only ever set via newScore; never double-counted
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  // Bug 6 — per-subtopic status: pending | current | passed | failed
  const [subtopicStatus, setSubtopicStatus] = useState({
    natural: "current",   // round 0 starts here
    integers: "pending",
    comparison: "pending",
    arithmetic: "pending",
    properties: "pending",
    lcm: "pending"
  })

  const loadQuestion = (r) => {
    const { subtopic, dimension, level } = MASTERY_ROUNDS[r]
    setLoading(true)
    setFeedback(null)
    api.generateMasteryQuestion(sessionId, subtopic, dimension, level)
      // Bug 10 — always spread so QuestionCard's useEffect fires reliably
      .then(res => { setQuestion({ ...res }); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    loadQuestion(0)
  }, [sessionId]) // eslint-disable-line

  const handleAnswer = async (option) => {
    if (!question) return
    setChecking(true)
    const { subtopic, dimension, level } = MASTERY_ROUNDS[round]
    const result = await api.checkAnswer(
      sessionId, question.text, question.correct_answer,
      option, subtopic, dimension, level
    )
    // Bug 1 — compute newScore once; use it everywhere — no double-counting
    const newScore = result.is_correct ? score + 1 : score
    setScore(newScore)
    setFeedback(result)
    setChecking(false)
  }

  const handleNext = () => {
    const nextRound = round + 1

    // Bug 6 — update pill status: mark current as passed/failed, advance next to current
    const currentKey = SUBTOPICS[round]?.key
    const nextKey    = SUBTOPICS[nextRound]?.key
    setSubtopicStatus(prev => ({
      ...prev,
      ...(currentKey ? { [currentKey]: feedback?.is_correct ? "passed" : "failed" } : {}),
      ...(nextKey && nextRound < MASTERY_ROUNDS.length ? { [nextKey]: "current" } : {})
    }))

    if (nextRound >= MASTERY_ROUNDS.length) {
      // Bug 1 — score already correct; no addition needed here
      const result = `${score} / ${MASTERY_ROUNDS.length}`
      updatePerformance("masteryGateResult", result)
      setDone(true)
    } else {
      setRound(nextRound)
      loadQuestion(nextRound)
    }
  }

  const handleContinue = () => {
    addCompletedTemplate("masteryGate")
    onNavigate("projectPlanning")
  }

  if (loading) return <LoadingScreen message="Generating mastery question..." />

  if (done) {
    const total  = MASTERY_ROUNDS.length
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

  return (
    <div>
      <TemplateHeader template="MASTERY GATE" subtitle={`Round ${round + 1} of ${MASTERY_ROUNDS.length}`} />

      {/* Bug 6 — subtopic progress pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {SUBTOPICS.map(st => (
          <span key={st.key} style={{ ...PILL_STYLE, ...pillColors(subtopicStatus[st.key]) }}>
            {st.label}
          </span>
        ))}
      </div>

      <div className="card" style={{ background: "#1A5276", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <p style={{ color: "white", fontFamily: "Arial", fontSize: "13px" }}>
            Level: <strong>{MASTERY_ROUNDS[round].level.toUpperCase()}</strong>
          </p>
          <p style={{ color: "#E87722", fontFamily: "Arial", fontSize: "13px", fontWeight: "bold" }}>
            Score: {score}/{round}
          </p>
        </div>
      </div>

      {question && (
        <QuestionCard question={question} onAnswer={handleAnswer} loading={checking} />
      )}
      {checking && <LoadingScreen message="Checking your answer..." />}

      {/* Bug 8 — isLast tells FeedbackCard to show "See My Results →" on the final round */}
      {feedback && (
        <FeedbackCard
          feedback={feedback}
          onNext={handleNext}
          isLast={round === MASTERY_ROUNDS.length - 1}
        />
      )}
    </div>
  )
}
