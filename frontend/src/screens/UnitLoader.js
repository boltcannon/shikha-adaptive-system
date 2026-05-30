import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

const GENERATION_STEPS = [
  "Reading Shikha's MAT framework...",
  "Building Provocation...",
  "Generating NCL content...",
  "Creating Analysis artifacts...",
  "Preparing Discussion...",
  "Setting up Mastery Gate...",
  "Preparing Reflection...",
  "Unit ready!",
]

export default function UnitLoader({ onNavigate }) {
  const { sessionId } = useUnit()
  const [source, setSource] = useState(null)   // "cache" | "generated"
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  // Tick through the step labels while generating
  useEffect(() => {
    if (source !== null || done) return
    const id = setInterval(() => {
      setStepIndex(prev =>
        prev < GENERATION_STEPS.length - 2 ? prev + 1 : prev
      )
    }, 3500)
    return () => clearInterval(id)
  }, [source, done])

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }

    api.generateAll(sessionId)
      .then(res => {
        setSource(res.source)
        setStepIndex(GENERATION_STEPS.length - 1) // "Unit ready!"
        setDone(true)
        setTimeout(() => onNavigate("provocation"), 800)
      })
      .catch(err => {
        setError("Failed to generate unit. Is the backend running?")
      })
  }, [sessionId]) // eslint-disable-line

  // ── Spinner ────────────────────────────────────────────
  const Spinner = () => (
    <div style={{
      width: "56px", height: "56px",
      border: "4px solid #E8F4FD",
      borderTop: `4px solid ${done ? "#1E8449" : "#E87722"}`,
      borderRadius: "50%",
      animation: done ? "none" : "spin 1s linear infinite",
      transition: "border-color 0.4s"
    }} />
  )

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "70vh", gap: "28px", padding: "24px"
    }}>
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Spinner />

      {/* Cache hit badge */}
      {source === "cache" && (
        <div style={{
          background: "#D5F5E3", border: "1px solid #1E8449",
          borderRadius: "20px", padding: "6px 16px",
          display: "flex", alignItems: "center", gap: "6px",
          animation: "fadeIn 0.3s ease"
        }}>
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span style={{ fontFamily: "Arial", fontSize: "13px",
                         fontWeight: "bold", color: "#1E8449" }}>
            Found in cache — loading instantly
          </span>
        </div>
      )}

      {/* Step list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "380px" }}>
        {GENERATION_STEPS.map((step, i) => {
          const isActive  = i === stepIndex && !done
          const isComplete = i < stepIndex || done
          const isFuture  = i > stepIndex && !done

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "10px",
              opacity: isFuture ? 0.35 : 1,
              transition: "opacity 0.4s",
              animation: isActive ? "fadeIn 0.3s ease" : "none"
            }}>
              <span style={{ fontSize: "16px", minWidth: "20px" }}>
                {isComplete
                  ? (i === GENERATION_STEPS.length - 1 && done ? "🎉" : "✅")
                  : isActive ? "🔄" : "○"}
              </span>
              <span style={{
                fontFamily: "Arial", fontSize: "14px",
                color: isComplete ? "#1E8449" : isActive ? "#E87722" : "#95A5A6",
                fontWeight: isActive ? "bold" : "normal",
                transition: "color 0.4s"
              }}>
                {step}
              </span>
            </div>
          )
        })}
      </div>

      {/* Source label while generating */}
      {source === "generated" && !done && (
        <p style={{ fontFamily: "Arial", fontSize: "13px",
                    color: "#5D6D7E", fontStyle: "italic" }}>
          Generating with AI — this takes about 30–60 seconds
        </p>
      )}

      {error && (
        <p style={{ fontFamily: "Arial", fontSize: "14px",
                    color: "#C0392B", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  )
}
