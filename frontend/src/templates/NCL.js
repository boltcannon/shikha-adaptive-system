import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"
import QuestionCard from "../components/QuestionCard"
import FeedbackCard from "../components/FeedbackCard"

const DEFAULT_SUBTOPIC = "core concepts"

export default function NCL({ onNavigate }) {
  const { sessionId, unitInput, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentQ, setCurrentQ] = useState(0)
  // currentQuestion is always a fresh spread — guarantees QuestionCard's
  // useEffect fires on every transition, even between structurally equal questions
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [checkingAnswer, setCheckingAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const subtopic = unitInput?.chapter || DEFAULT_SUBTOPIC

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateNCL(sessionId, subtopic)
      .then(res => {
        setData(res)
        // Spread the first question so it's a fresh object reference
        setCurrentQuestion({ ...res.questions[0] })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const handleAnswer = async (option) => {
    if (!currentQuestion) return
    setCheckingAnswer(true)
    const result = await api.checkAnswer(
      sessionId,
      currentQuestion.text,
      currentQuestion.correct_answer,
      option,
      subtopic,
      "knowledge",
      currentQuestion.level
    )
    if (result.is_correct) setScore(s => s + 1)
    setFeedback(result)
    setCheckingAnswer(false)
  }

  const handleNext = () => {
    const nextIndex = currentQ + 1

    // Reset all per-question state cleanly
    setFeedback(null)
    setCheckingAnswer(false)

    if (nextIndex >= (data?.questions?.length || 0)) {
      setDone(true)
    } else {
      setCurrentQ(nextIndex)
      // Spread to guarantee a new object reference → triggers useEffect in QuestionCard
      setCurrentQuestion({ ...data.questions[nextIndex] })
    }
  }

  const handleContinue = () => {
    addCompletedTemplate("ncl")
    saveStudentProgress({
      current_screen: "analysis",
      exit_ticket_score: data ? `${score}/${data.questions.length}` : null
    })
    onNavigate("analysis")
  }

  if (loading) return <SimpleLoader />
  if (!data) return (
    <p style={{ fontFamily: "Arial", color: "#C0392B" }}>
      Failed to load NCL content.
    </p>
  )

  if (done) {
    return (
      <div>
        <TemplateHeader template="NCL" subtitle="Complete" />
        <div className="dark-card" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "36px", marginBottom: "8px" }}>🎉</p>
          <h2 style={{ color: "white", fontFamily: "Arial", marginBottom: "8px" }}>
            {score} / {data.questions.length} correct
          </h2>
          <p style={{ color: "#D6EAF8", fontFamily: "Arial", fontSize: "14px" }}>
            Great work on {data.subtopic_name}!
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleContinue}
          style={{ width: "100%", padding: "14px", marginTop: "16px" }}
        >
          Continue to Analysis →
        </button>
      </div>
    )
  }

  return (
    <div>
      <TemplateHeader template="NCL" subtitle={data.subtopic_name} />

      {/* Concept card */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <h2 className="heading-2" style={{ marginBottom: "12px" }}>
          {data.subtopic_name}
        </h2>
        <p style={{
          fontFamily: "Arial", fontSize: "14px", color: "#2C3E50",
          lineHeight: "1.7", marginBottom: "12px"
        }}>
          {data.concept_explanation}
        </p>
        {data.real_world_connection && (
          <div style={{ background: "#EBF5FB", borderRadius: "8px", padding: "12px" }}>
            <p style={{
              fontFamily: "Arial", fontSize: "13px", color: "#1A5276",
              fontWeight: "bold", marginBottom: "4px"
            }}>
              Real-world connection
            </p>
            <p style={{
              fontFamily: "Arial", fontSize: "13px",
              color: "#2C3E50", lineHeight: "1.5"
            }}>
              {data.real_world_connection}
            </p>
          </div>
        )}
      </div>

      {/* Key facts */}
      {data.key_facts && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{
            fontFamily: "Arial", fontWeight: "bold",
            fontSize: "13px", color: "#1A5276", marginBottom: "8px"
          }}>
            Key Facts
          </p>
          {data.key_facts.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: "#E87722", fontWeight: "bold" }}>•</span>
              <p style={{
                fontFamily: "Arial", fontSize: "13px",
                color: "#2C3E50", lineHeight: "1.5"
              }}>
                {f}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Progress counter */}
      <div style={{
        marginBottom: "8px",
        display: "flex",
        justifyContent: "space-between"
      }}>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E" }}>
          Question {currentQ + 1} of {data.questions.length}
        </p>
        <p style={{
          fontFamily: "Arial", fontSize: "13px",
          color: "#1A5276", fontWeight: "bold"
        }}>
          Score: {score}/{currentQ}
        </p>
      </div>

      {/* QuestionCard receives fresh object — resets its own selected state via useEffect */}
      <QuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        loading={checkingAnswer}
      />

      {/* QuestionCard already disables options while checkingAnswer — no inline loader needed */}
      {/* Bug 8 — isLast so the final question shows "See My Results →" */}
      {feedback && (
        <FeedbackCard
          feedback={feedback}
          onNext={handleNext}
          isLast={currentQ === (data?.questions?.length ?? 1) - 1}
        />
      )}
    </div>
  )
}
