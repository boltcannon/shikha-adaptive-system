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

export default function MasteryGate({ onNavigate }) {
  const { sessionId, unitInput, addCompletedTemplate, updatePerformance } = useUnit()
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [checking, setChecking] = useState(false)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [roundResults, setRoundResults] = useState([])

  const loadQuestion = (r) => {
    const { subtopic, dimension, level } = MASTERY_ROUNDS[r]
    setLoading(true)
    setFeedback(null)
    api.generateMasteryQuestion(sessionId, subtopic, dimension, level)
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
    if (result.is_correct) setScore(s => s + 1)
    setRoundResults(prev => [...prev, result.is_correct])
    setFeedback(result)
    setChecking(false)
  }

  const handleNext = () => {
    const nextRound = round + 1
    if (nextRound >= MASTERY_ROUNDS.length) {
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
    const total = MASTERY_ROUNDS.length
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

      {/* Subtopic progress pills */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        {MASTERY_ROUNDS.map((r, i) => {
          const isPast = i < round
          const isCurrent = i === round
          const passed = isPast ? roundResults[i] : null
          return (
            <span key={i} style={{
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "12px",
              fontFamily: "Arial",
              fontWeight: isCurrent ? "bold" : "normal",
              background: isCurrent ? "#E87722" : isPast ? (passed ? "#D5F5E3" : "#FADBD8") : "#F2F3F4",
              color: isCurrent ? "white" : isPast ? (passed ? "#1E8449" : "#C0392B") : "#95A5A6",
              border: `1px solid ${isCurrent ? "#E87722" : isPast ? (passed ? "#1E8449" : "#C0392B") : "#E5E7E9"}`
            }}>
              {isPast ? (passed ? "✓" : "✗") : isCurrent ? "▶" : "○"} {r.subtopic} ({r.level})
            </span>
          )
        })}
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
      {feedback && <FeedbackCard feedback={feedback} onNext={handleNext} />}
    </div>
  )
}
