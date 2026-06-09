import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

export default function UnitLoader({ onNavigate, onClassCode }) {
  const { sessionId, unitInput, setGeneratedContent } = useUnit()

  const [timedOut, setTimedOut] = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    startGeneration()
  }, [sessionId]) // eslint-disable-line

  const startGeneration = async () => {
    setTimedOut(false)
    setError("")

    // Show timeout screen after 90 seconds
    const timer = setTimeout(() => setTimedOut(true), 90000)

    try {
      const result = await api.generateAll(sessionId)
      clearTimeout(timer)

      if (result.source) {
        if (result.content) setGeneratedContent(result.content)
        // Fetch the auto-created class code so the nav bar can show the Copy Link button
        try {
          const classData = await api.createClass(sessionId)
          if (classData.class_code) {
            localStorage.setItem("autoClassCode", classData.class_code)
            if (onClassCode) onClassCode(classData.class_code)
          }
        } catch (e) {
          console.log("Could not fetch class code:", e)
        }
        setTimeout(() => onNavigate("provocation"), 1000)
      } else {
        setError("Generation failed. Please try again.")
      }
    } catch (e) {
      clearTimeout(timer)
      setError("Could not generate unit. Is the backend running?")
    }
  }

  // ── Timeout screen ────────────────────────────────────────────
  if (timedOut) {
    return (
      <div style={{
        display       : "flex",
        flexDirection : "column",
        alignItems    : "center",
        justifyContent: "center",
        minHeight     : "70vh",
        gap           : "20px",
        textAlign     : "center",
        padding       : "24px",
      }}>
        <p style={{ fontSize: "48px", margin: 0 }}>⏱</p>
        <h2 style={{ fontSize: "20px", color: "#1A5276", fontFamily: "Arial", margin: 0 }}>
          This is taking longer than usual
        </h2>
        <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial", maxWidth: "300px", margin: 0 }}>
          The AI is working hard. You can wait a little longer or try again.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={startGeneration}
            className="btn-primary"
          >
            Try Again
          </button>
          <button
            onClick={() => onNavigate("teacherInput")}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ── Error screen ──────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        display       : "flex",
        flexDirection : "column",
        alignItems    : "center",
        justifyContent: "center",
        minHeight     : "70vh",
        gap           : "16px",
        textAlign     : "center",
        padding       : "24px",
      }}>
        <p style={{ fontSize: "48px", margin: 0 }}>⚠️</p>
        <h2 style={{ fontSize: "18px", color: "#C0392B", fontFamily: "Arial", margin: 0 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial", maxWidth: "320px", margin: 0 }}>
          {error}
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={startGeneration} className="btn-primary">Try Again</button>
          <button onClick={() => onNavigate("teacherInput")} className="btn-secondary">Go Back</button>
        </div>
      </div>
    )
  }

  // ── Loading spinner ───────────────────────────────────────────
  return (
    <div style={{
      display       : "flex",
      flexDirection : "column",
      alignItems    : "center",
      justifyContent: "center",
      minHeight     : "70vh",
      gap           : "32px",
    }}>
      <div style={{
        width       : "64px",
        height      : "64px",
        border      : "5px solid #F2F3F4",
        borderTop   : "5px solid #E87722",
        borderRadius: "50%",
        animation   : "spin 1s linear infinite",
      }} />

      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", color: "#1A5276", fontFamily: "Arial", fontWeight: "bold", marginBottom: "8px" }}>
          We are almost there...
        </h2>
        <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial" }}>
          {unitInput?.context && unitInput.context !== "general"
            ? `Building your ${unitInput.context} unit`
            : "Building your unit"}
        </p>
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
