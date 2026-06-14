import React, { useEffect, useRef, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

export default function Provocation({ onNavigate }) {
  const { sessionId, generatedContent, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")
  const [step,    setStep]    = useState(1) // 1 | 2 | 3

  // Step 1 — shared observation about the 3 scenarios
  const [observationText, setObservationText] = useState("")

  // Step 3 — one reflection textarea per scenario
  const [scenarioReflections, setScenarioReflections] = useState(["", "", ""])

  // Step 3 — AI provocation feedback
  const [provFeedback,  setProvFeedback]  = useState(null)
  const [checkingProv,  setCheckingProv]  = useState(false)
  const [showBeginBtn,  setShowBeginBtn]  = useState(false)

  // Debounced auto-save for observation text
  const saveTimer = useRef(null)

  // Scroll to top whenever step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    if (generatedContent?.provocation) {
      setData(generatedContent.provocation)
      setLoading(false)
      return
    }
    api.generateProvocation(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => { setError("Failed to generate Provocation"); setLoading(false) })
  }, [sessionId]) // eslint-disable-line

  const updateReflection = (i, value) =>
    setScenarioReflections(prev => prev.map((v, idx) => idx === i ? value : v))

  // Debounced save — fires 2 s after the student stops typing in Step 1
  const debouncedSaveObservation = (value) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (value.trim().length >= 10) {
        saveStudentProgress({ provocation_observation: value, current_screen: "provocation" })
      }
    }, 2000)
  }

  // Step 3 — fetch AI acknowledgement of student's observation
  const handleGetFeedback = async () => {
    setCheckingProv(true)
    try {
      const result = await api.checkProvocation(
        sessionId,
        observationText,
        scenarioReflections.filter(r => r.trim()),
      )
      if (result?.acknowledgement) setProvFeedback(result.acknowledgement)
      setShowBeginBtn(true)
    } catch {
      setShowBeginBtn(true)  // if AI fails, just show Begin Learning
    }
    setCheckingProv(false)
  }

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
      <TemplateHeader template="PROVOCATION" subtitle={`Step 1 of 3`} />

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
          onChange={e => {
            setObservationText(e.target.value)
            debouncedSaveObservation(e.target.value)
          }}
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
        onClick={() => {
          saveStudentProgress({ provocation_observation: observationText, current_screen: "provocation" })
          setStep(2)
        }}
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
      <TemplateHeader template="PROVOCATION" subtitle={`Step 2 of 3`} />

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
      <TemplateHeader template="PROVOCATION" subtitle={`Step 3 of 3`} />

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

            {/* Submit button — visible until AI feedback loads */}
            {!provFeedback && !checkingProv && (
              <button
                className="btn-primary"
                onClick={handleGetFeedback}
                disabled={!canProceed}
                style={{
                  width: "100%", padding: "14px",
                  background: canProceed ? "#E87722" : "#BDC3C7",
                  cursor: canProceed ? "pointer" : "not-allowed",
                  border: "none", borderRadius: "8px", color: "white",
                  fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
                }}
              >
                Submit My Observations →
              </button>
            )}

            {/* AI thinking state */}
            {checkingProv && (
              <div style={{
                background: "#EBF5FB", borderRadius: "10px",
                padding: "16px", textAlign: "center",
              }}>
                <p style={{ color: "#1A5276", fontFamily: "Arial", fontSize: "14px" }}>
                  Reading your observations...
                </p>
              </div>
            )}

            {/* AI feedback card */}
            {provFeedback && (
              <div style={{
                background: "#D5F5E3", border: "1px solid #1E8449",
                borderRadius: "10px", padding: "16px", marginBottom: "16px",
              }}>
                <p style={{
                  fontSize: "12px", fontWeight: "bold", color: "#1E8449",
                  fontFamily: "Arial", marginBottom: "8px",
                }}>
                  Your AI Teacher says:
                </p>
                <p style={{
                  fontSize: "14px", color: "#2C3E50",
                  fontFamily: "Arial", lineHeight: "1.7",
                }}>
                  {provFeedback}
                </p>
              </div>
            )}

            {/* Begin Learning — appears after feedback (or after AI failure) */}
            {showBeginBtn && (
              <button
                className="btn-primary"
                onClick={handleBeginLearning}
                style={{
                  width: "100%", padding: "14px",
                  border: "none", borderRadius: "8px", color: "white",
                  fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
                }}
              >
                Begin Learning →
              </button>
            )}
          </>
        )
      })()}
    </div>
  )

}
