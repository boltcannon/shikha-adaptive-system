import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import LoadingScreen from "../components/LoadingScreen"
import TemplateHeader from "../components/TemplateHeader"

export default function ProjectPlanning({ onNavigate }) {
  const { sessionId, addCompletedTemplate, updatePerformance } = useUnit()
  const [projectIdea, setProjectIdea] = useState("")
  const [message, setMessage] = useState("")
  const [guidance, setGuidance] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState("")
  const [history, setHistory] = useState([])
  const [error, setError] = useState("")

  const handleAskGuide = async () => {
    if (!projectIdea.trim()) {
      setError("Please describe your project idea before continuing.")
      return
    }
    if (!message.trim()) {
      setError("Please type a question before asking the helpline.")
      return
    }
    setError("")
    setLoading(true)
    const result = await api.guideProject(sessionId, projectIdea, message, progress)
    setHistory(prev => [...prev, { message, guidance: result }])
    setProgress(prev => prev + " | " + message)
    setGuidance(result)
    setMessage("")
    updatePerformance("projectIdea", projectIdea)
    setLoading(false)
  }

  const handleContinue = () => {
    addCompletedTemplate("projectPlanning")
    onNavigate("rac")
  }

  return (
    <div>
      <TemplateHeader template="PROJECT PLANNING" subtitle="Helpline" />

      <div className="dark-card" style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>YOUR ROLE: HELPLINE</p>
        <p style={{ color: "white", fontFamily: "Arial", fontSize: "14px", lineHeight: "1.6" }}>
          I'll guide you through your project — but I won't do it for you.
          Tell me your idea and ask me anything. Let's think it through together.
        </p>
      </div>

      {/* Project idea input */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <label style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", display: "block", marginBottom: "6px" }}>
          What is your project idea?
        </label>
        <input
          type="text"
          placeholder="e.g. I want to create a poster showing integers in cricket..."
          value={projectIdea}
          onChange={e => setProjectIdea(e.target.value)}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid #BDC3C7", fontFamily: "Arial", fontSize: "14px"
          }}
        />
      </div>

      {/* Chat history */}
      {history.map((h, i) => (
        <div key={i} style={{ marginBottom: "16px" }}>
          <div style={{
            background: "#EBF5FB", borderRadius: "8px", padding: "12px",
            marginBottom: "8px", textAlign: "right"
          }}>
            <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#1A5276" }}>{h.message}</p>
          </div>
          <div className="card" style={{ borderLeft: "4px solid #E87722" }}>
            <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.6", marginBottom: "8px" }}>
              {h.guidance.response}
            </p>
            <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#E87722", fontWeight: "bold", marginBottom: "4px" }}>
              Next step → {h.guidance.next_step}
            </p>
            <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", fontStyle: "italic" }}>
              💭 {h.guidance.guiding_question}
            </p>
          </div>
        </div>
      ))}

      {/* Message input */}
      <div className="card">
        <label style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", display: "block", marginBottom: "6px" }}>
          Ask the helpline
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="What are you stuck on? What do you want to know?"
          rows={3}
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid #BDC3C7", fontFamily: "Arial",
            fontSize: "14px", resize: "vertical", marginBottom: "12px"
          }}
        />
        {error && (
          <p style={{
            color: "#C0392B",
            fontSize: "13px",
            marginTop: "8px",
            fontFamily: "Arial",
            marginBottom: "8px"
          }}>
            {error}
          </p>
        )}
        <button className="btn-orange" onClick={handleAskGuide} disabled={loading}>
          {loading ? "Thinking..." : "Ask the helpline →"}
        </button>
        {loading && <LoadingScreen message="Getting guidance..." />}
      </div>

      {guidance && (
        <div style={{ marginTop: "16px" }}>
          {guidance.concepts_to_apply && (
            <div className="card" style={{ background: "#EBF5FB" }}>
              <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "8px" }}>
                Concepts to apply in your project
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {guidance.concepts_to_apply.map((c, i) => (
                  <span key={i} style={{
                    background: "#1A5276", color: "white",
                    padding: "4px 12px", borderRadius: "16px",
                    fontFamily: "Arial", fontSize: "12px"
                  }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          <button className="btn-primary" onClick={handleContinue}
            style={{ width: "100%", padding: "14px", marginTop: "16px" }}>
            Continue to Research & Artifact Creation →
          </button>
        </div>
      )}
    </div>
  )
}
