import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import LoadingScreen from "../components/LoadingScreen"
import TemplateHeader from "../components/TemplateHeader"

export default function Discussion({ onNavigate }) {
  const { sessionId, addCompletedTemplate } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Bug 4 — track which perspective index the student chose
  const [selectedPosition, setSelectedPosition] = useState(null)
  // Reasoning textarea shown only once a position is selected
  const [reasoning, setReasoning] = useState("")
  // Bug 4 — synthesis textareas, one per prompt
  const [synthesisResponses, setSynthesisResponses] = useState(["", "", ""])

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateDiscussion(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const updateSynthesis = (i, value) =>
    setSynthesisResponses(prev => prev.map((v, idx) => idx === i ? value : v))

  const handleContinue = () => {
    addCompletedTemplate("discussion")
    onNavigate("masteryGate")
  }

  if (loading) return <LoadingScreen />
  if (!data) return <p style={{ fontFamily: "Arial", color: "#C0392B" }}>Failed to load Discussion.</p>

  const perspectives = data.perspectives || []
  const synthesisPrompts = data.synthesis_prompts || []

  return (
    <div>
      <TemplateHeader template="DISCUSSION" subtitle="Moderator" />

      {/* Discussion question */}
      <div className="dark-card" style={{ textAlign: "center", marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>
          THE DISCUSSION QUESTION
        </p>
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

      {/* Bug 4 — Four perspectives in a 2×2 grid (two cards side by side) */}
      <h2 className="heading-2" style={{ marginBottom: "6px" }}>Four Perspectives</h2>
      <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#95A5A6", marginBottom: "12px" }}>
        Tap a perspective to select your position.
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        marginBottom: "24px"
      }}>
        {perspectives.map((p, i) => {
          const isSelected = selectedPosition === i
          return (
            <div
              key={i}
              onClick={() => setSelectedPosition(i)}
              style={{
                background: isSelected ? "#FEF9E7" : "white",
                border: `2px solid ${isSelected ? "#E87722" : "#BDC3C7"}`,
                borderRadius: "10px",
                padding: "14px",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <p style={{
                  fontFamily: "Arial", fontWeight: "bold", fontSize: "13px",
                  color: isSelected ? "#E87722" : "#1A5276"
                }}>
                  {p.name}
                </p>
                {isSelected && (
                  <span style={{
                    background: "#E87722", color: "white",
                    borderRadius: "10px", fontSize: "10px",
                    padding: "2px 8px", fontFamily: "Arial", fontWeight: "bold", flexShrink: 0
                  }}>
                    ✓ Chosen
                  </span>
                )}
              </div>
              <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#2C3E50", fontWeight: "500", marginBottom: "6px", lineHeight: "1.4" }}>
                "{p.position}"
              </p>
              <p style={{ fontFamily: "Arial", fontSize: "11px", color: "#5D6D7E", lineHeight: "1.4" }}>
                {p.reasoning}
              </p>
            </div>
          )
        })}
      </div>

      {/* Bug 4 — reasoning textarea appears only after a position is selected */}
      {selectedPosition !== null && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px", color: "#1A5276", marginBottom: "4px" }}>
            You chose: {perspectives[selectedPosition]?.name}
          </p>
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "10px" }}>
            Why do you think this? Use evidence from the chapter in your argument.
          </p>
          <textarea
            value={reasoning}
            onChange={e => setReasoning(e.target.value)}
            placeholder="Why do you think this? Use evidence..."
            rows={4}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px",
              borderRadius: "8px", border: "1px solid #BDC3C7",
              fontFamily: "Arial", fontSize: "14px", resize: "vertical"
            }}
          />
        </div>
      )}

      {/* Bug 4 — synthesis prompts with individual textareas */}
      {synthesisPrompts.length > 0 && (
        <div className="card" style={{ background: "#EBF5FB", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "12px" }}>
            Go deeper — synthesis questions
          </p>
          {synthesisPrompts.map((prompt, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50", marginBottom: "6px", lineHeight: "1.5" }}>
                {i + 1}. {prompt}
              </p>
              <textarea
                placeholder="Write your thoughts..."
                value={synthesisResponses[i] || ""}
                onChange={e => updateSynthesis(i, e.target.value)}
                rows={2}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "8px",
                  borderRadius: "6px", border: "1px solid #AED6F1",
                  fontFamily: "Arial", fontSize: "13px",
                  resize: "vertical", background: "white"
                }}
              />
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary" onClick={handleContinue}
        style={{ width: "100%", padding: "14px" }}>
        Continue to Mastery Gate →
      </button>
    </div>
  )
}
