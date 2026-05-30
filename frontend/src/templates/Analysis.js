import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import LoadingScreen from "../components/LoadingScreen"
import TemplateHeader from "../components/TemplateHeader"

export default function Analysis({ onNavigate }) {
  const { sessionId, addCompletedTemplate } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentQ, setCurrentQ] = useState(0)
  const [responses, setResponses] = useState({})
  const [input, setInput] = useState("")
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState(false)

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateAnalysis(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const handleSubmit = () => {
    if (!input.trim()) { setSubmitError(true); return }
    setSubmitError(false)
    setResponses(prev => ({ ...prev, [currentQ]: input }))
    setInput("")
    if (currentQ + 1 >= (data?.guiding_questions?.length || 0)) {
      setDone(true)
    } else {
      setCurrentQ(q => q + 1)
    }
  }

  const handleContinue = () => {
    addCompletedTemplate("analysis")
    onNavigate("discussion")
  }

  if (loading) return <LoadingScreen />
  if (!data) return <p style={{ fontFamily: "Arial", color: "#C0392B" }}>Failed to load Analysis.</p>

  if (done) {
    return (
      <div>
        <TemplateHeader template="ANALYSIS" subtitle="Complete" />
        <div className="dark-card">
          <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>WHAT THE CLASS DISCOVERED</p>
          <p style={{ color: "white", fontFamily: "Arial", fontSize: "15px", lineHeight: "1.7" }}>
            {data.class_model}
          </p>
        </div>
        {data.reflection_prompts && (
          <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F" }}>
            <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#7D6608", marginBottom: "8px" }}>
              Reflect further
            </p>
            {data.reflection_prompts.map((p, i) => (
              <p key={i} style={{ fontFamily: "Arial", fontSize: "13px", color: "#7D6608", marginBottom: "6px" }}>
                {i + 1}. {p}
              </p>
            ))}
          </div>
        )}
        <button className="btn-primary" onClick={handleContinue}
          style={{ width: "100%", padding: "14px", marginTop: "16px" }}>
          Continue to Discussion →
        </button>
      </div>
    )
  }

  return (
    <div>
      <TemplateHeader template="ANALYSIS" subtitle="Shepherd" />

      {/* Artifact */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <h2 className="heading-2" style={{ marginBottom: "4px" }}>{data.artifact_title}</h2>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "16px" }}>
          {data.artifact_description}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.data && data.data.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: "8px",
              background: i % 2 === 0 ? "#F8F9FA" : "white",
              border: "1px solid #E5E7E9"
            }}>
              <span style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50" }}>{row.label}</span>
              <span style={{ fontFamily: "Arial", fontSize: "14px", fontWeight: "bold", color: "#1A5276" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guiding question */}
      <div className="card">
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#E87722", fontWeight: "bold", marginBottom: "6px" }}>
          Question {currentQ + 1} of {data.guiding_questions?.length}
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "16px", color: "#2C3E50", lineHeight: "1.6", marginBottom: "16px" }}>
          {data.guiding_questions?.[currentQ]}
        </p>
        <textarea
          value={input}
          onChange={e => { setInput(e.target.value); if (submitError) setSubmitError(false) }}
          placeholder="Write your observation here..."
          rows={4}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: `1px solid ${submitError ? "#C0392B" : "#BDC3C7"}`,
            fontFamily: "Arial", fontSize: "14px", resize: "vertical", marginBottom: "4px",
            outline: submitError ? "none" : undefined,
            boxShadow: submitError ? "0 0 0 2px rgba(192,57,43,0.2)" : "none"
          }}
        />
        {submitError && (
          <p style={{ color: "#C0392B", fontFamily: "Arial", fontSize: "12px", marginBottom: "10px" }}>
            Please write your observation before submitting.
          </p>
        )}
        <button className="btn-orange" onClick={handleSubmit} style={{ marginTop: submitError ? "0" : "8px" }}>
          Submit Observation →
        </button>
      </div>
    </div>
  )
}
