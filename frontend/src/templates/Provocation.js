import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import LoadingScreen from "../components/LoadingScreen"
import TemplateHeader from "../components/TemplateHeader"

const DEFAULT_NORMS = [
  "I will listen actively and not interrupt others",
  "I will respect all opinions, even if I disagree",
  "I will use evidence to support my ideas",
  "I will keep an open mind and be willing to change my view",
  "I will help everyone feel safe to share their thoughts"
]

export default function Provocation({ onNavigate }) {
  const { sessionId, unitInput, addCompletedTemplate } = useUnit()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [responses, setResponses] = useState({})
  const [normsChecked, setNormsChecked] = useState({})

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateProvocation(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setError("Failed to generate Provocation"); setLoading(false) })
  }, [sessionId]) // eslint-disable-line

  const handleContinue = () => {
    addCompletedTemplate("provocation")
    onNavigate("ncl")
  }

  if (loading) return <LoadingScreen />
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
        <div key={i} className="card" style={{ borderLeft: "4px solid #E87722" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "24px" }}>{s.icon}</span>
            <h3 style={{ fontFamily: "Arial", fontSize: "16px", color: "#1A5276" }}>{s.title}</h3>
          </div>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.6", marginBottom: "12px" }}>
            {s.description}
          </p>
          <div style={{ background: "#EBF5FB", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
            <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#1A5276", fontWeight: "bold", marginBottom: "4px" }}>
              Think about this →
            </p>
            <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.5" }}>
              {s.question}
            </p>
          </div>
          <textarea
            value={responses[i] || ""}
            onChange={e => setResponses(prev => ({ ...prev, [i]: e.target.value }))}
            placeholder="Write your initial thoughts here..."
            rows={3}
            style={{
              width: "100%", padding: "10px", borderRadius: "8px",
              border: "1px solid #BDC3C7", fontFamily: "Arial",
              fontSize: "14px", resize: "vertical"
            }}
          />
        </div>
      ))}

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
        <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F" }}>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#7D6608", lineHeight: "1.6" }}>
            🔍 {data.observation_prompt}
          </p>
        </div>
      )}

      {/* Community norms */}
      {(() => {
        const norms = data.norms || DEFAULT_NORMS
        const allNormsChecked = norms.every((_, i) => normsChecked[i])
        const scenarioCount = data.scenarios?.length || 0
        const allResponded = Array.from({ length: scenarioCount }, (_, i) => i)
          .every(i => responses[i]?.trim())
        const canContinue = allResponded && allNormsChecked
        return (
          <>
            <div className="card" style={{ marginTop: "8px" }}>
              <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "10px" }}>
                Community Norms — I agree to:
              </p>
              {norms.map((norm, i) => (
                <label key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  marginBottom: "10px", cursor: "pointer"
                }}>
                  <input
                    type="checkbox"
                    checked={normsChecked[i] || false}
                    onChange={e => setNormsChecked(prev => ({ ...prev, [i]: e.target.checked }))}
                    style={{ marginTop: "2px", width: "15px", height: "15px", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50", lineHeight: "1.5" }}>
                    {norm}
                  </span>
                </label>
              ))}
            </div>

            {!canContinue && (
              <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#E87722", marginTop: "12px", textAlign: "center" }}>
                {!allResponded
                  ? "Share your thoughts on all scenarios before continuing."
                  : "Check all community norms to continue."}
              </p>
            )}
            <button
              className="btn-primary"
              onClick={handleContinue}
              disabled={!canContinue}
              style={{
                marginTop: "12px", width: "100%", padding: "14px",
                opacity: canContinue ? 1 : 0.45,
                cursor: canContinue ? "pointer" : "not-allowed"
              }}
            >
              Continue to New Content Learning →
            </button>
          </>
        )
      })()}
    </div>
  )
}
