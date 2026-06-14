import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

export default function Discussion({ onNavigate }) {
  const { sessionId, generatedContent, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [selectedPosition, setSelectedPosition] = useState(null)
  const [reasoning, setReasoning] = useState("")
  const [synthesisResponses, setSynthesisResponses] = useState(["", "", ""])

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    if (generatedContent?.discussion) {
      setData(generatedContent.discussion)
      setLoading(false)
      return
    }
    api.generateDiscussion(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const updateSynthesis = (i, value) =>
    setSynthesisResponses(prev => prev.map((v, idx) => idx === i ? value : v))

  const handleContinue = () => {
    addCompletedTemplate("discussion")
    saveStudentProgress({
      current_screen      : "masteryGate",
      discussion_position : selectedPosition,
      discussion_reasoning: reasoning,
    })
    onNavigate("masteryGate")
  }

  if (loading) return <SimpleLoader />
  if (!data) return <p style={{ fontFamily: "Arial", color: "#C0392B" }}>Failed to load Discussion.</p>

  const perspectives = data.perspectives || []
  const synthesisPrompts = data.synthesis_prompts || []

  const canContinue = synthesisPrompts.length === 0 ||
    synthesisPrompts.every((_, i) => (synthesisResponses[i] || "").trim().length >= 20)

  return (
    <div>
      <TemplateHeader template="EXPLORE PERSPECTIVES" subtitle="Think from multiple angles" />

      {/* Central question */}
      <div className="dark-card" style={{ textAlign: "center", marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>
          THE CENTRAL QUESTION
        </p>
        <p style={{ fontSize: "18px", color: "white", fontFamily: "Arial", lineHeight: "1.6" }}>
          {data.discussion_question}
        </p>
      </div>

      {/* Intro framing */}
      <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F", marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#7D6608", marginBottom: "6px" }}>
          Great thinkers consider many perspectives before forming their own view.
          Read these 4 different viewpoints on the Central Question — then form your own reasoned position.
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#7D6608" }}>
          💡 {data.why_no_single_answer}
        </p>
      </div>

      {/* Four perspectives */}
      <h2 className="heading-2" style={{ marginBottom: "6px" }}>Four Perspectives</h2>
      <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#95A5A6", marginBottom: "12px" }}>
        Which perspective do you find most convincing so far?
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
              onClick={() => {
                setSelectedPosition(i)
                saveStudentProgress({ discussion_position: i, current_screen: "discussion" })
              }}
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

      {/* Reasoning textarea — appears after a perspective is selected */}
      {selectedPosition !== null && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px", color: "#1A5276", marginBottom: "4px" }}>
            You find this most convincing: {perspectives[selectedPosition]?.name}
          </p>
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "10px" }}>
            Explain your thinking. What from the chapter supports this view?
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

      {/* Synthesis prompts */}
      {synthesisPrompts.length > 0 && (
        <div className="card" style={{ background: "#EBF5FB", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "12px" }}>
            Your Reasoned Position
          </p>
          {synthesisPrompts.map((prompt, i) => {
            const charCount = (synthesisResponses[i] || "").trim().length
            const met = charCount >= 20
            return (
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
                    borderRadius: "6px",
                    border: `1px solid ${met ? "#1E8449" : "#AED6F1"}`,
                    fontFamily: "Arial", fontSize: "13px",
                    resize: "vertical", background: "white"
                  }}
                />
                <p style={{
                  fontSize: "11px",
                  color: met ? "#1E8449" : "#BDC3C7",
                  fontFamily: "Arial",
                  textAlign: "right",
                  marginTop: "3px"
                }}>
                  {met ? "✓ Good answer" : `${charCount}/20 minimum characters`}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {!canContinue && (
        <p style={{
          fontSize: "13px",
          color: "#E87722",
          fontFamily: "Arial",
          textAlign: "center",
          marginBottom: "8px"
        }}>
          Please answer all synthesis questions before continuing.
          Each answer needs at least a sentence.
        </p>
      )}
      <button
        onClick={handleContinue}
        disabled={!canContinue}
        style={{
          width: "100%", padding: "14px",
          background: canContinue ? "#1A5276" : "#BDC3C7",
          color: "white",
          border: "none", borderRadius: "8px",
          cursor: canContinue ? "pointer" : "not-allowed",
          fontFamily: "Arial", fontSize: "14px", fontWeight: "bold"
        }}
      >
        Continue to Mastery Gate →
      </button>
    </div>
  )
}
