import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

export default function Reflection({ onNavigate }) {
  const { sessionId, generatedContent, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState({})

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    // Use pre-generated content if available — zero API call
    if (generatedContent?.reflection) {
      setData(generatedContent.reflection)
      setLoading(false)
    } else {
      // Fallback — only if not pre-generated
      loadReflection()
    }
  }, [generatedContent]) // eslint-disable-line

  const loadReflection = async () => {
    setLoading(true)
    try {
      const result = await api.generateReflection(sessionId, "", "", "", "")
      setData(result)
    } catch (e) {
      console.warn("Reflection generation failed:", e)
    }
    setLoading(false)
  }

  const handleFinish = () => {
    addCompletedTemplate("reflection")
    saveStudentProgress({ current_screen: "done", reflection_done: true })
    onNavigate("teacherInput")
  }

  if (loading) return <SimpleLoader />
  if (!data) return <p style={{ fontFamily: "Arial", color: "#C0392B" }}>Failed to generate reflection.</p>

  return (
    <div>
      <TemplateHeader template="REFLECTION & CELEBRATION" subtitle="Co-Reflector" />

      {/* Celebration */}
      <div className="dark-card" style={{ textAlign: "center", marginBottom: "24px" }}>
        <p style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</p>
        <p style={{ color: "#E87722", fontFamily: "Arial", fontSize: "11px", letterSpacing: "1px", marginBottom: "8px" }}>
          CELEBRATION
        </p>
        <p style={{ color: "white", fontFamily: "Arial", fontSize: "16px", lineHeight: "1.7" }}>
          {data.celebration_message}
        </p>
      </div>

      {/* Journey summary */}
      <div className="card" style={{ borderLeft: "4px solid #E87722", marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#E87722", marginBottom: "6px" }}>
          YOUR JOURNEY
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.7" }}>
          {data.journey_summary}
        </p>
      </div>

      {/* Reflection questions */}
      <h2 className="heading-2" style={{ marginBottom: "12px" }}>Reflect Deeply</h2>
      {data.reflection_questions && data.reflection_questions.map((q, i) => (
        <div key={i} className="card" style={{ marginBottom: "12px" }}>
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#E87722", fontWeight: "bold", marginBottom: "4px" }}>
            Question {i + 1}
          </p>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.6", marginBottom: "10px" }}>
            {q}
          </p>
          <textarea
            value={answers[i] || ""}
            onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
            placeholder="Write your reflection here..."
            rows={3}
            style={{
              width: "100%", padding: "10px", borderRadius: "8px",
              border: "1px solid #BDC3C7", fontFamily: "Arial",
              fontSize: "13px", resize: "vertical"
            }}
          />
        </div>
      ))}

      {/* Growth */}
      {data.growth_observed && (
        <div className="card" style={{ background: "#EBF5FB", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "6px" }}>
            Growth observed
          </p>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.6" }}>
            {data.growth_observed}
          </p>
        </div>
      )}

      {/* Big question answer */}
      {data.big_question_answer && (
        <div className="dark-card">
          <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>
            HOW YOU ANSWERED THE BIG QUESTION
          </p>
          <p style={{ color: "white", fontFamily: "Arial", fontSize: "15px", lineHeight: "1.7" }}>
            {data.big_question_answer}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
        <button className="btn-primary" onClick={handleFinish}
          style={{ flex: 1, padding: "14px" }}>
          Start a New Unit →
        </button>
        <button
          onClick={() => onNavigate("teacherDashboard")}
          style={{
            flex: 1, padding: "14px", background: "white",
            border: "2px solid #1A5276", borderRadius: "8px",
            color: "#1A5276", fontFamily: "Arial", fontSize: "14px",
            cursor: "pointer", fontWeight: "bold"
          }}
        >
          View Teacher Report
        </button>
      </div>
    </div>
  )
}
