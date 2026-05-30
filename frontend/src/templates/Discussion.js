import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import LoadingScreen from "../components/LoadingScreen"
import TemplateHeader from "../components/TemplateHeader"

export default function Discussion({ onNavigate }) {
  const { sessionId, addCompletedTemplate } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [position, setPosition] = useState("")
  const [synthResponses, setSynthResponses] = useState({})
  const [selectedPerspective, setSelectedPerspective] = useState(null)

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateDiscussion(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const handleContinue = () => {
    addCompletedTemplate("discussion")
    onNavigate("masteryGate")
  }

  if (loading) return <LoadingScreen />
  if (!data) return <p style={{ fontFamily: "Arial", color: "#C0392B" }}>Failed to load Discussion.</p>

  return (
    <div>
      <TemplateHeader template="DISCUSSION" subtitle="Moderator" />

      {/* Discussion question */}
      <div className="dark-card" style={{ textAlign: "center", marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>THE DISCUSSION QUESTION</p>
        <p style={{ fontSize: "18px", color: "white", fontFamily: "Arial", lineHeight: "1.6" }}>
          {data.discussion_question}
        </p>
      </div>

      {/* Why no single answer */}
      <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F", marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#7D6608" }}>
          💡 {data.why_no_single_answer}
        </p>
      </div>

      {/* Four perspectives */}
      <h2 className="heading-2" style={{ marginBottom: "12px" }}>Four Perspectives</h2>
      <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#95A5A6", marginBottom: "8px" }}>
        Tap a perspective to select it as your starting position.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
        {data.perspectives && data.perspectives.map((p, i) => {
          const isSelected = selectedPerspective === i
          return (
            <div
              key={i}
              onClick={() => {
                setSelectedPerspective(i)
                setPosition(p.position || p.name)
              }}
              className="card"
              style={{
                borderLeft: `4px solid ${isSelected ? "#E87722" : "#1A5276"}`,
                background: isSelected ? "#FEF9E7" : "white",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px", color: isSelected ? "#E87722" : "#1A5276" }}>
                  {p.name}
                </p>
                <span style={{
                  background: isSelected ? "#E87722" : "#EBF5FB",
                  color: isSelected ? "white" : "#1A5276",
                  padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontFamily: "Arial"
                }}>
                  {isSelected ? "✓ Selected" : `Position ${i + 1}`}
                </span>
              </div>
              <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", fontWeight: "500", marginBottom: "6px" }}>
                "{p.position}"
              </p>
              <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", lineHeight: "1.5" }}>
                {p.reasoning}
              </p>
            </div>
          )
        })}
      </div>

      {/* Your position */}
      <div className="card">
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px", color: "#1A5276", marginBottom: "8px" }}>
          What is YOUR position?
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "12px" }}>
          Which perspective do you agree with most — and why? Use the chapter concepts in your argument.
        </p>
        <textarea
          value={position}
          onChange={e => setPosition(e.target.value)}
          placeholder="Write your argument here..."
          rows={4}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid #BDC3C7", fontFamily: "Arial",
            fontSize: "14px", resize: "vertical", marginBottom: "12px"
          }}
        />
      </div>

      {/* Synthesis prompts with response textareas */}
      {data.synthesis_prompts && (
        <div className="card" style={{ background: "#EBF5FB" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "12px" }}>
            Go deeper — synthesis questions
          </p>
          {data.synthesis_prompts.map((sp, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50", marginBottom: "6px", lineHeight: "1.5" }}>
                {i + 1}. {sp}
              </p>
              <textarea
                value={synthResponses[i] || ""}
                onChange={e => setSynthResponses(prev => ({ ...prev, [i]: e.target.value }))}
                placeholder="Write your thoughts..."
                rows={2}
                style={{
                  width: "100%", padding: "8px", borderRadius: "6px",
                  border: "1px solid #AED6F1", fontFamily: "Arial",
                  fontSize: "13px", resize: "vertical", background: "white"
                }}
              />
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary" onClick={handleContinue}
        style={{ width: "100%", padding: "14px", marginTop: "24px" }}>
        Continue to Mastery Gate →
      </button>
    </div>
  )
}
