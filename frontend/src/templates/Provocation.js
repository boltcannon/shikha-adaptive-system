import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

const NORMS = [
  "I will ask questions when I do not understand",
  "I will try before asking for help",
  "I will respect different ways of thinking",
  "I will give honest feedback to my peers",
  "I will reflect on my learning at every session"
]

export default function Provocation({ onNavigate }) {
  const { sessionId, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")
  const [step,    setStep]    = useState(1) // 1 | 2 | 3 | 4

  // Step 1 — shared observation about the 3 scenarios
  const [observationText, setObservationText] = useState("")

  // Step 3 — one reflection textarea per scenario
  const [scenarioReflections, setScenarioReflections] = useState(["", "", ""])

  // Step 4 — community norms
  const [checkedNorms, setCheckedNorms] = useState(NORMS.map(() => false))

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateProvocation(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setError("Failed to generate Provocation"); setLoading(false) })
  }, [sessionId]) // eslint-disable-line

  const updateReflection = (i, value) =>
    setScenarioReflections(prev => prev.map((v, idx) => idx === i ? value : v))

  const toggleNorm = (i) =>
    setCheckedNorms(prev => prev.map((v, idx) => idx === i ? !v : v))

  const allNormsChecked = checkedNorms.every(n => n)

  const handleBeginLearning = () => {
    addCompletedTemplate("provocation")
    saveStudentProgress({
      current_screen          : "ncl",
      provocation_answers     : {
        observation   : observationText,
        reflections   : scenarioReflections.filter(r => r.trim().length > 0),
        scenarios_seen: scenarios.map(s => s.title),
      },
      provocation_observation : observationText,
      provocation_reflections : [
        scenarioReflections[0] || "",
        scenarioReflections[1] || "",
        scenarioReflections[2] || "",
      ],
    })
    onNavigate("ncl")
  }

  if (loading) return <SimpleLoader />
  if (error)   return <p style={{ color: "#C0392B", fontFamily: "Arial" }}>{error}</p>
  if (!data)   return null

  const scenarios = data.scenarios || []

  // ── STEP 1 — Scenarios + observation ────────────────────────────
  if (step === 1) return (
    <div>
      <TemplateHeader template="PROVOCATION" subtitle={`Step 1 of 4`} />

      <h2 className="heading-2" style={{ marginBottom: "16px" }}>Your Scenarios</h2>
      {scenarios.map((s, i) => (
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
            borderRadius: "8px",
            border: `1px solid ${observationText.trim().length >= 20 ? "#1E8449" : "#BDC3C7"}`,
            fontFamily: "Arial", fontSize: "14px", resize: "vertical"
          }}
        />
        <p style={{
          fontSize: "11px",
          color: observationText.trim().length >= 20 ? "#1E8449" : "#BDC3C7",
          fontFamily: "Arial", marginTop: "4px",
        }}>
          {observationText.trim().length}/20 characters minimum
        </p>
      </div>

      {!( observationText.trim().length >= 20) && (
        <p style={{
          fontSize: "12px", color: "#E87722",
          fontFamily: "Arial", marginBottom: "8px",
        }}>
          Please write at least one observation before continuing.
        </p>
      )}

      <button
        className="btn-primary"
        onClick={() => setStep(2)}
        disabled={observationText.trim().length < 20}
        style={{
          width: "100%", padding: "14px",
          background: observationText.trim().length >= 20 ? "#E87722" : "#BDC3C7",
          cursor: observationText.trim().length >= 20 ? "pointer" : "not-allowed",
          border: "none", borderRadius: "8px", color: "white",
          fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
        }}
      >
        Next →
      </button>
    </div>
  )

  // ── STEP 2 — Mission + Big Question ─────────────────────────────
  if (step === 2) return (
    <div>
      <TemplateHeader template="PROVOCATION" subtitle={`Step 2 of 4`} />

      <div className="dark-card" style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "6px" }}>YOUR ROLE</p>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px", fontFamily: "Arial" }}>
          {data.student_role}
        </h2>
        <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#D6EAF8", fontFamily: "Arial" }}>
          {data.mission_statement}
        </p>
      </div>

      <div style={{
        background: "#1A5276", borderRadius: "12px", padding: "24px",
        marginBottom: "24px", textAlign: "center"
      }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px", fontFamily: "Arial" }}>
          THE BIG QUESTION
        </p>
        <p style={{ fontSize: "18px", color: "white", fontFamily: "Arial", lineHeight: "1.6", fontWeight: "500" }}>
          {data.big_question}
        </p>
      </div>

      {data.observation_prompt && (
        <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#7D6608", lineHeight: "1.6" }}>
            🔍 {data.observation_prompt}
          </p>
        </div>
      )}

      <button
        className="btn-primary"
        onClick={() => setStep(3)}
        style={{ width: "100%", padding: "14px" }}
      >
        Next →
      </button>
    </div>
  )

  // ── STEP 3 — Per-scenario reflection textareas ───────────────────
  if (step === 3) return (
    <div>
      <TemplateHeader template="PROVOCATION" subtitle={`Step 3 of 4`} />

      <div className="card" style={{ background: "#EBF5FB", marginBottom: "20px" }}>
        <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#1A5276", lineHeight: "1.6" }}>
          Now think more carefully about each scenario.
          Write your thoughts for each one below.
        </p>
      </div>

      {scenarios.map((s, i) => {
        const answered = scenarioReflections[i].trim().length >= 15
        return (
          <div key={i} className="card" style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "20px" }}>{s.icon}</span>
              <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px", color: "#1A5276" }}>
                {s.title}
              </p>
              {answered && (
                <span style={{
                  marginLeft: "auto", background: "#D5F5E3", color: "#1E8449",
                  fontSize: "11px", fontWeight: "bold", fontFamily: "Arial",
                  padding: "2px 8px", borderRadius: "10px",
                }}>
                  ✓
                </span>
              )}
            </div>
            <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "8px", lineHeight: "1.5" }}>
              {s.question}
            </p>
            <textarea
              value={scenarioReflections[i]}
              onChange={e => updateReflection(i, e.target.value)}
              placeholder="Write your thoughts..."
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px",
                borderRadius: "8px",
                border: `1px solid ${answered ? "#1E8449" : "#BDC3C7"}`,
                fontFamily: "Arial", fontSize: "14px", resize: "vertical",
              }}
            />
          </div>
        )
      })}

      {(() => {
        const answeredCount = scenarioReflections.filter(r => r.trim().length >= 15).length
        const canProceed    = answeredCount >= 2
        return (
          <>
            {!canProceed && (
              <p style={{
                fontSize: "12px", color: "#E87722",
                fontFamily: "Arial", marginBottom: "8px",
              }}>
                Please answer at least 2 reflection questions before continuing.
                ({answeredCount}/2 answered)
              </p>
            )}
            <button
              className="btn-primary"
              onClick={() => setStep(4)}
              disabled={!canProceed}
              style={{
                width: "100%", padding: "14px",
                background: canProceed ? "#E87722" : "#BDC3C7",
                cursor: canProceed ? "pointer" : "not-allowed",
                border: "none", borderRadius: "8px", color: "white",
                fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
              }}
            >
              Next →
            </button>
          </>
        )
      })()}
    </div>
  )

  // ── STEP 4 — Community Norms + Begin Learning ────────────────────
  return (
    <div>
      <TemplateHeader template="PROVOCATION" subtitle={`Step 4 of 4`} />

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

      <button
        className="btn-primary"
        onClick={handleBeginLearning}
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
