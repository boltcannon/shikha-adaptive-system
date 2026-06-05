import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

// Bug 3 — five norms from spec (exact text)
const NORMS = [
  "I will ask questions when I do not understand",
  "I will try before asking for help",
  "I will respect different ways of thinking",
  "I will give honest feedback to my peers",
  "I will reflect on my learning at every session"
]

export default function Provocation({ onNavigate }) {
  const { sessionId, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Bug 3 — single observation textarea (not per-scenario)
  const [observationText, setObservationText] = useState("")
  // Bug 3 — boolean array, one entry per norm
  const [checkedNorms, setCheckedNorms] = useState(NORMS.map(() => false))

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateProvocation(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setError("Failed to generate Provocation"); setLoading(false) })
  }, [sessionId]) // eslint-disable-line

  const handleContinue = () => {
    addCompletedTemplate("provocation")
    saveStudentProgress({ current_screen: "ncl" })
    onNavigate("ncl")
  }

  const toggleNorm = (i) =>
    setCheckedNorms(prev => prev.map((v, idx) => idx === i ? !v : v))

  // Bug 3 — gate requires ALL norms checked; observation is optional
  const allNormsChecked = checkedNorms.every(n => n)

  if (loading) return <SimpleLoader />
  if (error) return <p style={{ color: "#C0392B", fontFamily: "Arial" }}>{error}</p>
  if (!data) return null

  return (
    <div>
      <TemplateHeader template="PROVOCATION" subtitle="Co-Explorer" />

      {/* Role card */}
      <div className="dark-card" style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "6px" }}>YOUR ROLE</p>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px", fontFamily: "Arial" }}>
          {data.student_role}
        </h2>
        <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#D6EAF8", fontFamily: "Arial" }}>
          {data.mission_statement}
        </p>
      </div>

      {/* Scenarios */}
      <h2 className="heading-2" style={{ marginBottom: "16px" }}>Your Scenarios</h2>
      {data.scenarios && data.scenarios.map((s, i) => (
        <div key={i} className="card" style={{ borderLeft: "4px solid #E87722", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>{s.icon}</span>
            <h3 style={{ fontFamily: "Arial", fontSize: "16px", color: "#1A5276" }}>{s.title}</h3>
          </div>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.6", marginBottom: "12px" }}>
            {s.description}
          </p>
          <div style={{ background: "#EBF5FB", borderRadius: "8px", padding: "12px" }}>
            <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#1A5276", fontWeight: "bold", marginBottom: "4px" }}>
              Think about this →
            </p>
            <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.5" }}>
              {s.question}
            </p>
          </div>
        </div>
      ))}

      {/* Bug 3 — single shared observation textarea below all scenarios */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <label style={{
          display: "block", fontFamily: "Arial", fontWeight: "bold",
          fontSize: "13px", color: "#1A5276", marginBottom: "8px"
        }}>
          What do you notice about these situations? Write freely...
        </label>
        <textarea
          value={observationText}
          onChange={e => setObservationText(e.target.value)}
          placeholder="Share your thoughts, patterns you spotted, questions you have..."
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px",
            borderRadius: "8px", border: "1px solid #BDC3C7",
            fontFamily: "Arial", fontSize: "14px", resize: "vertical"
          }}
        />
      </div>

      {/* Big question */}
      <div style={{
        background: "#1A5276", borderRadius: "12px", padding: "24px",
        margin: "24px 0", textAlign: "center"
      }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px", fontFamily: "Arial" }}>
          THE BIG QUESTION
        </p>
        <p style={{ fontSize: "18px", color: "white", fontFamily: "Arial", lineHeight: "1.6", fontWeight: "500" }}>
          {data.big_question}
        </p>
      </div>

      {/* Observation prompt */}
      {data.observation_prompt && (
        <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#7D6608", lineHeight: "1.6" }}>
            🔍 {data.observation_prompt}
          </p>
        </div>
      )}

      {/* Bug 3 — community norms with spec's exact text */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "12px" }}>
          Community Norms — I agree to:
        </p>
        {NORMS.map((norm, i) => (
          <label key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            marginBottom: "10px", cursor: "pointer"
          }}>
            <input
              type="checkbox"
              checked={checkedNorms[i]}
              onChange={() => toggleNorm(i)}
              style={{ marginTop: "2px", width: "15px", height: "15px", cursor: "pointer", flexShrink: 0 }}
            />
            <span style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50", lineHeight: "1.5" }}>
              {norm}
            </span>
          </label>
        ))}
      </div>

      {!allNormsChecked && (
        <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#E87722", textAlign: "center", marginBottom: "8px" }}>
          Please agree to all community norms to begin learning.
        </p>
      )}

      {/* Bug 3 — gated: disabled + grey until all norms checked */}
      <button
        className="btn-primary"
        onClick={handleContinue}
        disabled={!allNormsChecked}
        style={{
          width: "100%", padding: "14px",
          background: allNormsChecked ? "#1A5276" : "#BDC3C7",
          cursor: allNormsChecked ? "pointer" : "not-allowed",
          border: "none", borderRadius: "8px", color: "white",
          fontFamily: "Arial", fontSize: "14px", fontWeight: "bold"
        }}
      >
        Begin Learning →
      </button>
    </div>
  )
}
