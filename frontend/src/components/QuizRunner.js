import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "./SimpleLoader"

/**
 * QuizRunner — shared quiz component used by NCL (exit ticket) and MasteryGate.
 *
 * Flow: answering → submitting → results
 *
 * Props:
 *   questions  — array of { text, options, correct_answer, explanation?, level?, subtopic? }
 *   onComplete — called with (score, batchResult) when quiz finishes
 *   title      — heading shown above progress dots
 *   subtitle   — sub-heading / instruction text
 *   subtopic   — passed to batch-check API as context for AI feedback on wrong answers
 */
export default function QuizRunner({
  questions = [],
  onComplete,
  title,
  subtitle,
  subtopic,
}) {
  const { sessionId } = useUnit()

  const [currentIndex,   setCurrentIndex]   = useState(0)
  const [studentAnswers, setStudentAnswers]  = useState({})
  const [phase,          setPhase]          = useState("answering")
  // phases: "answering" | "submitting" | "results"
  const [results,        setResults]        = useState(null)

  const currentQuestion = questions[currentIndex]
  const totalQuestions  = questions.length
  const answeredCount   = Object.keys(studentAnswers).length
  const allAnswered     = answeredCount === totalQuestions && totalQuestions > 0

  const handleSelect = (option) => {
    setStudentAnswers(prev => ({ ...prev, [currentIndex]: option }))
  }

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentIndex(currentIndex + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const handleSubmitAll = async () => {
    setPhase("submitting")

    const answersToCheck = questions.map((q, i) => ({
      question      : q.text,
      correct_answer: q.correct_answer,
      student_answer: studentAnswers[i] || "",
      explanation   : q.explanation   || "",
      misconception : q.misconception  || "",
      subtopic      : subtopic || q.subtopic || "",
      dimension     : q.dimension || "knowledge",
      level         : q.level    || "medium",
    }))

    try {
      const batchResult = await api.checkAnswersBatch(sessionId, answersToCheck)
      setResults(batchResult)
      setPhase("results")
      onComplete(batchResult.score, batchResult)
    } catch (e) {
      // Fallback — score locally, no AI feedback
      const score = questions.reduce((acc, q, i) => {
        const correct =
          (studentAnswers[i] || "").trim().toLowerCase() ===
          (q.correct_answer || "").trim().toLowerCase()
        return acc + (correct ? 1 : 0)
      }, 0)
      const total = totalQuestions
      const colour  = score >= total * 0.8 ? "green" : score >= total * 0.5 ? "amber" : "red"
      const message = score >= total * 0.8 ? "Excellent work!"
                    : score >= total * 0.5 ? "Good effort. Some concepts need review."
                    : "This topic needs more attention."
      const fallback = {
        score, total, colour, message,
        results: questions.map((q, i) => ({
          question      : q.text,
          student_answer: studentAnswers[i] || "",
          correct_answer: q.correct_answer,
          is_correct    : (studentAnswers[i] || "").trim().toLowerCase() ===
                          (q.correct_answer || "").trim().toLowerCase(),
          explanation   : q.explanation || "",
        })),
      }
      setResults(fallback)
      setPhase("results")
      onComplete(score, fallback)
    }
  }

  // ── SUBMITTING ────────────────────────────────────────────────────
  if (phase === "submitting") return <SimpleLoader />

  // ── RESULTS ───────────────────────────────────────────────────────
  if (phase === "results" && results) {
    const colourMap = {
      green: { bg: "#D5F5E3", border: "#1E8449", text: "#1E8449" },
      amber: { bg: "#FEF9E7", border: "#B7950B", text: "#B7950B" },
      red  : { bg: "#FADBD8", border: "#C0392B", text: "#C0392B" },
    }
    const c = colourMap[results.colour] || colourMap.amber

    return (
      <div>
        {/* Score banner */}
        <div style={{
          background: c.bg, border: `2px solid ${c.border}`,
          borderRadius: "12px", padding: "24px",
          textAlign: "center", marginBottom: "24px",
        }}>
          <p style={{ fontSize: "52px", fontWeight: "bold", color: c.text,
                      fontFamily: "Arial", margin: "0 0 4px" }}>
            {results.score}/{results.total}
          </p>
          <p style={{ fontSize: "18px", fontWeight: "bold", color: c.text,
                      fontFamily: "Arial", margin: "0 0 4px" }}>
            {results.message}
          </p>
          <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", margin: 0 }}>
            {results.score} correct out of {results.total} questions
          </p>
        </div>

        {/* Per-question breakdown */}
        <div style={{ marginBottom: "24px" }}>
          {results.results.map((r, i) => (
            <div key={i} style={{
              background  : r.is_correct ? "#F9FFFC" : "#FFFAF9",
              border      : `1px solid ${r.is_correct ? "#A9DFBF" : "#F1948A"}`,
              borderRadius: "10px",
              padding     : "16px",
              marginBottom: "10px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "2px" }}>
                  {r.is_correct ? "✅" : "❌"}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontWeight: "bold", fontSize: "14px", color: "#2C3E50",
                    fontFamily: "Arial", marginBottom: "6px",
                  }}>
                    Q{i + 1}: {r.question}
                  </p>
                  <p style={{ fontSize: "13px", color: "#5D6D7E",
                               fontFamily: "Arial", marginBottom: "4px" }}>
                    Your answer:{" "}
                    <strong style={{ color: r.is_correct ? "#1E8449" : "#C0392B" }}>
                      {r.student_answer || "Not answered"}
                    </strong>
                  </p>
                  {!r.is_correct && (
                    <p style={{ fontSize: "13px", color: "#1E8449",
                                 fontFamily: "Arial", marginBottom: "4px" }}>
                      Correct answer: <strong>{r.correct_answer}</strong>
                    </p>
                  )}
                  {r.feedback && !r.is_correct && (
                    <p style={{ fontSize: "13px", color: "#1A5276",
                                 fontFamily: "Arial", marginTop: "4px" }}>
                      {r.feedback}
                    </p>
                  )}
                  {r.explanation && (
                    <p style={{
                      fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial",
                      fontStyle: "italic", marginTop: "6px",
                      paddingTop: "6px", borderTop: "1px solid #F2F3F4",
                    }}>
                      💡 {r.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── ANSWERING ─────────────────────────────────────────────────────
  if (totalQuestions === 0) {
    return (
      <div style={{ textAlign: "center", padding: "32px", color: "#95A5A6",
                     fontFamily: "Arial" }}>
        No questions available.
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1A5276",
                      fontFamily: "Arial", marginBottom: "4px" }}>
          {title}
        </h2>
        <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
          {subtitle}
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            style={{
              width: "32px", height: "32px", borderRadius: "50%",
              border: `2px solid ${i === currentIndex ? "#E87722" : studentAnswers[i] ? "#1A5276" : "#BDC3C7"}`,
              background: i === currentIndex ? "#E87722" : studentAnswers[i] ? "#1A5276" : "white",
              color: (i === currentIndex || studentAnswers[i]) ? "white" : "#BDC3C7",
              fontWeight: "bold", fontSize: "13px", cursor: "pointer", fontFamily: "Arial",
            }}
          >
            {studentAnswers[i] ? "✓" : i + 1}
          </button>
        ))}
      </div>

      {/* Current question card */}
      <div style={{
        background: "white", borderRadius: "12px",
        padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        marginBottom: "16px",
      }}>
        <p style={{
          fontSize: "12px", color: "#E87722", fontFamily: "Arial",
          fontWeight: "bold", marginBottom: "8px",
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          Question {currentIndex + 1} of {totalQuestions}
        </p>
        <p style={{
          fontSize: "16px", color: "#2C3E50", fontFamily: "Arial",
          marginBottom: "20px", lineHeight: "1.6", fontWeight: "500",
        }}>
          {currentQuestion?.text}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {currentQuestion?.options?.map((option, i) => {
            const isSelected = studentAnswers[currentIndex] === option
            return (
              <button
                key={i}
                onClick={() => handleSelect(option)}
                style={{
                  background  : isSelected ? "#1A5276" : "white",
                  color       : isSelected ? "white"   : "#2C3E50",
                  border      : `2px solid ${isSelected ? "#1A5276" : "#BDC3C7"}`,
                  borderRadius: "8px", padding: "12px 16px",
                  cursor: "pointer", fontFamily: "Arial",
                  fontSize: "14px", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation row */}
      <div style={{ display: "flex", justifyContent: "space-between",
                     alignItems: "center", marginBottom: "12px" }}>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{
            background: "white",
            color: currentIndex === 0 ? "#BDC3C7" : "#1A5276",
            border: `1px solid ${currentIndex === 0 ? "#F2F3F4" : "#1A5276"}`,
            borderRadius: "8px", padding: "10px 20px",
            cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            fontFamily: "Arial", fontSize: "14px",
          }}
        >
          ← Previous
        </button>

        <span style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
          {answeredCount} of {totalQuestions} answered
        </span>

        {currentIndex < totalQuestions - 1 ? (
          <button
            onClick={handleNext}
            style={{
              background: "#1A5276", color: "white", border: "none",
              borderRadius: "8px", padding: "10px 20px",
              cursor: "pointer", fontFamily: "Arial", fontSize: "14px",
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmitAll}
            disabled={!allAnswered}
            style={{
              background: allAnswered ? "#E87722" : "#BDC3C7",
              color: "white", border: "none", borderRadius: "8px",
              padding: "10px 20px",
              cursor: allAnswered ? "pointer" : "not-allowed",
              fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
            }}
          >
            Submit All Answers →
          </button>
        )}
      </div>

      {/* Reminder when on last question but not all answered */}
      {!allAnswered && currentIndex === totalQuestions - 1 && (
        <p style={{ fontSize: "13px", color: "#E87722", fontFamily: "Arial",
                     textAlign: "center" }}>
          {totalQuestions - answeredCount} question{totalQuestions - answeredCount !== 1 ? "s" : ""} still unanswered — use the dots above to go back.
        </p>
      )}
    </div>
  )
}
