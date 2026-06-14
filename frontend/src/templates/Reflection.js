import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

export default function Reflection({ onNavigate }) {
  const {
    sessionId,
    generatedContent,
    studentProgress,
    studentId,
    currentUser,
    unitInput,
    addCompletedTemplate,
    saveStudentProgress,
  } = useUnit()

  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }

    // Only use cached reflection if it was generated with the new
    // personalised format (has opening_message). Old-format cache
    // (journey_summary etc.) always triggers a fresh personalised call.
    if (generatedContent?.reflection?.opening_message) {
      setContent(generatedContent.reflection)
      setLoading(false)
      return
    }
    loadReflection()
  }, [sessionId]) // eslint-disable-line

  const loadReflection = async () => {
    setLoading(true)
    try {
      const progress = studentProgress || {}
      const result = await api.generateReflection(
        sessionId,
        progress.exit_ticket_score,
        progress.mastery_gate_result,
        progress.project_idea,
        (progress.completed_templates || []).join(", "),
        progress.provocation_observation || "",
        progress.provocation_reflections || []
      )
      setContent(result)
    } catch (e) {
      console.error("Reflection load error:", e)
    }
    setLoading(false)
  }

  const handleFinish = async () => {
    addCompletedTemplate("reflection")

    const idToUse = studentId || currentUser?.user_id
    if (idToUse && sessionId) {
      try {
        await api.saveCompletedUnit(idToUse, {
          chapter            : unitInput?.chapter            || "",
          grade              : unitInput?.grade              || "",
          subject            : unitInput?.subject            || "",
          context            : unitInput?.context            || "",
          exit_ticket_score  : studentProgress?.exit_ticket_score,
          mastery_gate_result: studentProgress?.mastery_gate_result,
          strong_subtopics   : studentProgress?.strong_subtopics  || [],
          weak_subtopics     : studentProgress?.weak_subtopics    || [],
          project_idea       : studentProgress?.project_idea      || "",
          session_id         : sessionId,
        })
      } catch (e) {
        console.error("Could not save to history:", e)
      }
    }

    await saveStudentProgress({ current_screen: "done", reflection_done: true })
    onNavigate("finalSummary")
  }

  if (loading) return <SimpleLoader />
  if (!content) return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <p style={{ color: "#C0392B", fontFamily: "Arial", marginBottom: "16px" }}>
        Could not generate your reflection. Please try again.
      </p>
      <button className="btn-primary" onClick={loadReflection}>
        Try Again
      </button>
    </div>
  )

  const questions  = content.questions || []
  const answeredCount = questions.filter((_, i) => (answers[i] || "").trim().length > 10).length

  return (
    <div>
      <TemplateHeader template="REFLECTION & CELEBRATION" subtitle="Co-Reflector" />

      {/* ── Personal opening message ───────────────── */}
      {content.opening_message && (
        <div style={{
          background: "#1A5276", borderRadius: "12px",
          padding: "20px 24px", marginBottom: "20px",
        }}>
          <p style={{
            fontSize: "11px", color: "#E87722", fontFamily: "Arial",
            fontWeight: "bold", letterSpacing: "1px", marginBottom: "10px",
          }}>
            YOUR JOURNEY
          </p>
          <p style={{
            color: "white", fontSize: "15px",
            fontFamily: "Arial", lineHeight: "1.7",
          }}>
            {content.opening_message}
          </p>
        </div>
      )}

      {/* ── Reflection questions ───────────────────── */}
      <h2 className="heading-2" style={{ marginBottom: "4px" }}>
        Reflect Deeply
      </h2>
      <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "16px" }}>
        Answer at least {Math.min(2, questions.length)} questions to complete your reflection.
        ({answeredCount}/{Math.min(2, questions.length)} done)
      </p>

      {questions.map((q, i) => {
        const isAnswered = (answers[i] || "").trim().length > 10
        return (
          <div
            key={q.id}
            className="card"
            style={{
              marginBottom: "16px",
              border: `1px solid ${isAnswered ? "#1E8449" : "#E5E7E9"}`,
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
              <span style={{
                background: isAnswered ? "#1E8449" : "#E87722",
                color: "white", borderRadius: "50%",
                width: "22px", height: "22px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "bold", fontFamily: "Arial",
                flexShrink: 0, marginTop: "1px",
              }}>
                {isAnswered ? "+" : i + 1}
              </span>
              <p style={{
                fontWeight: "bold", fontSize: "14px",
                color: "#1A5276", fontFamily: "Arial", lineHeight: "1.5",
              }}>
                {q.question}
              </p>
            </div>

            <p style={{
              fontSize: "12px", color: "#E87722", fontFamily: "Arial",
              fontStyle: "italic", marginBottom: "10px", paddingLeft: "32px",
            }}>
              {q.prompt}
            </p>

            <textarea
              value={answers[i] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
              onBlur={e => {
                const updated = { ...answers, [i]: e.target.value }
                saveStudentProgress({ reflection_answers: updated, current_screen: "reflection" })
              }}
              placeholder="Write your reflection here..."
              rows={3}
              style={{
                width: "100%", padding: "10px", borderRadius: "8px",
                border: `1px solid ${isAnswered ? "#1E8449" : "#BDC3C7"}`,
                fontFamily: "Arial", fontSize: "14px",
                lineHeight: "1.6", resize: "vertical",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />
          </div>
        )
      })}

      {/* ── Celebration note ───────────────────────── */}
      {content.celebration_note && (
        <div style={{
          background: "#D5F5E3", border: "1px solid #1E8449",
          borderRadius: "12px", padding: "20px",
          marginBottom: "20px", textAlign: "center",
        }}>
          <p style={{ fontSize: "32px", marginBottom: "10px" }}>🎉</p>
          <p style={{
            color: "#1E8449", fontSize: "14px",
            fontFamily: "Arial", lineHeight: "1.7",
            fontWeight: "500",
          }}>
            {content.celebration_note}
          </p>
        </div>
      )}

      {/* ── Finish button ──────────────────────────── */}
      <button
        className="btn-primary"
        onClick={handleFinish}
        disabled={answeredCount < Math.min(2, questions.length)}
        style={{
          width: "100%", padding: "14px",
          background: answeredCount >= Math.min(2, questions.length) ? "#E87722" : "#BDC3C7",
          cursor: answeredCount >= Math.min(2, questions.length) ? "pointer" : "not-allowed",
          marginTop: "8px",
        }}
      >
        See My Learning Summary →
      </button>
    </div>
  )
}
