import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

export default function StudentJoin({ onNavigate, initialCode = "" }) {
  const {
    setSessionId, setStudentId, setStudentName,
    setClassCode, setStudentProgress
  } = useUnit()

  const [step, setStep]           = useState(initialCode ? "name" : "code")
  const [code, setCode]           = useState(initialCode.toUpperCase())
  const [name, setName]           = useState("")
  const [classInfo, setClassInfo] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")

  // Auto-lookup class info when arriving from a /join/:code URL
  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      handleCodeSubmit()
    }
  }, []) // eslint-disable-line

  const handleCodeSubmit = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError("Please enter your class code"); return }
    setLoading(true)
    setError("")
    try {
      const result = await api.getClass(trimmed)
      if (result.detail) throw new Error(result.detail)
      setClassInfo(result)
      setCode(trimmed)
      setStep("name")
    } catch (e) {
      setError("Class not found. Check your code and try again.")
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) { setError("Please enter your name"); return }
    setLoading(true)
    setError("")
    try {
      const result = await api.joinClass(code, trimmedName)
      if (result.detail) throw new Error(result.detail)

      setStudentId(result.student_id)
      setStudentName(result.student_name)
      setClassCode(code)
      setSessionId(result.session_id)

      if (result.progress) {
        setStudentProgress(result.progress)
        // Returning student — resume where they left off
        if (result.returning && result.progress.current_screen) {
          onNavigate(result.progress.current_screen)
          return
        }
      }
      onNavigate("provocation")
    } catch (e) {
      setError(e.message || "Could not join. Please try again.")
    }
    setLoading(false)
  }

  const inputStyle = {
    width: "100%", padding: "12px", borderRadius: "8px",
    border: "2px solid #BDC3C7", fontFamily: "Arial",
    fontSize: "16px", marginBottom: "16px",
    boxSizing: "border-box"
  }

  const labelStyle = {
    display: "block", marginBottom: "6px",
    fontWeight: "bold", fontSize: "13px",
    color: "#1A5276", fontFamily: "Arial"
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", fontFamily: "Arial", fontWeight: "bold", marginBottom: "8px" }}>
          SHIKHA ACADEMY
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1A5276", fontFamily: "Arial", marginBottom: "8px" }}>
          Join Your Class
        </h1>
        <p style={{ color: "#5D6D7E", fontFamily: "Arial", fontSize: "14px" }}>
          Enter the code your teacher gave you
        </p>
      </div>

      {/* Step 1 — enter class code */}
      {step === "code" && (
        <div className="card">
          <label style={labelStyle}>Class Code</label>
          <input
            type="text"
            placeholder="e.g. ABC-123"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError("") }}
            onKeyDown={e => e.key === "Enter" && handleCodeSubmit()}
            style={{ ...inputStyle, textAlign: "center", letterSpacing: "6px", fontSize: "22px", fontWeight: "bold" }}
            autoFocus
          />
          {error && (
            <p style={{ color: "#C0392B", fontSize: "13px", marginBottom: "12px", fontFamily: "Arial" }}>
              {error}
            </p>
          )}
          <button
            className="btn-primary"
            onClick={handleCodeSubmit}
            disabled={loading}
            style={{ width: "100%", padding: "14px" }}
          >
            {loading ? "Checking..." : "Find My Class →"}
          </button>
        </div>
      )}

      {/* Step 2 — enter name */}
      {step === "name" && classInfo && (
        <div>
          {/* Unit info card */}
          <div className="dark-card" style={{ marginBottom: "16px" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", fontFamily: "Arial", marginBottom: "4px" }}>
              You are joining
            </p>
            <p style={{ color: "white", fontWeight: "bold", fontSize: "20px", fontFamily: "Arial", marginBottom: "4px" }}>
              {classInfo.unit_input.chapter}
            </p>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", fontFamily: "Arial" }}>
              {classInfo.unit_input.grade} &middot; {classInfo.unit_input.subject}
              {classInfo.unit_input.context !== "general"
                ? ` · ${classInfo.unit_input.context}`
                : ""}
            </p>
          </div>

          <div className="card">
            <label style={labelStyle}>Your Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={e => { setName(e.target.value); setError("") }}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              style={inputStyle}
              autoFocus
            />
            {error && (
              <p style={{ color: "#C0392B", fontSize: "13px", marginBottom: "12px", fontFamily: "Arial" }}>
                {error}
              </p>
            )}
            <button
              className="btn-primary"
              onClick={handleJoin}
              disabled={loading}
              style={{ width: "100%", padding: "14px" }}
            >
              {loading ? "Joining..." : "Start Learning →"}
            </button>
          </div>

          <button
            onClick={() => { setStep("code"); setError("") }}
            style={{
              background: "none", border: "none",
              color: "#5D6D7E", fontSize: "13px",
              cursor: "pointer", fontFamily: "Arial",
              marginTop: "12px", padding: "8px"
            }}
          >
            ← Use a different code
          </button>
        </div>
      )}
    </div>
  )
}
