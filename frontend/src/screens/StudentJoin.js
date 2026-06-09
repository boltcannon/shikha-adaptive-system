import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"

export default function StudentJoin({ onNavigate, initialCode = "" }) {
  const {
    setSessionId, setStudentId,
    setStudentName, setClassCode,
    setStudentProgress, login,
    currentUser,
    classCode: savedCode,
  } = useUnit()

  // Resolve code from URL param → context → empty
  const code = (initialCode || savedCode || "").trim().toUpperCase()

  // Start in loading state; useEffect will resolve it
  const [fetching,  setFetching]  = useState(true)
  const [name,      setName]      = useState("")
  const [classInfo, setClassInfo] = useState(null)
  const [joining,   setJoining]   = useState(false)
  const [error,     setError]     = useState("")

  useEffect(() => {
    if (code) {
      lookupClass()
    } else {
      setFetching(false) // no code in URL or context — show error page
    }
  }, []) // eslint-disable-line

  const lookupClass = async () => {
    setFetching(true)
    setError("")
    try {
      const result = await api.getClass(code)
      if (result.detail) throw new Error(result.detail)
      setClassInfo(result)
    } catch (e) {
      setError("Class not found. Please check the link and try again.")
    }
    setFetching(false)
  }

  const handleJoin = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) { setError("Please enter your name"); return }
    setJoining(true)
    setError("")
    try {
      const result = await api.joinClass(code, trimmedName)
      if (result.detail) throw new Error(result.detail)

      setStudentId(result.student_id)
      setStudentName(result.student_name)
      setClassCode(code)
      setSessionId(result.session_id)

      // Auto-register so student can resume sessions across devices
      if (!currentUser) {
        try {
          const authResult = await api.register(
            result.student_name,
            `${result.student_id}@shikha.student`,
            result.student_id,
            "student"
          )
          if (authResult.token) {
            login(
              { user_id: authResult.user_id, name: authResult.name,
                email: authResult.email, role: "student" },
              authResult.token
            )
          }
        } catch {
          // Account may already exist — that is ok
        }
      }

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
    setJoining(false)
  }

  // ── Loading while looking up class ───────────────────────────────
  if (fetching) return <SimpleLoader />

  // ── No code in URL or class not found ───────────────────────────
  if (!code || !classInfo) {
    return (
      <div style={{
        maxWidth   : "440px",
        margin     : "0 auto",
        textAlign  : "center",
        padding    : "48px 24px",
      }}>
        <p style={{ fontSize: "48px", margin: "0 0 16px" }}>🔗</p>
        <h2 style={{
          fontSize    : "20px",
          color       : "#1A5276",
          fontFamily  : "Arial",
          marginBottom: "12px",
        }}>
          {!code ? "No class link found" : "Class not found"}
        </h2>
        <p style={{
          fontSize  : "14px",
          color     : "#5D6D7E",
          fontFamily: "Arial",
          lineHeight: "1.6",
        }}>
          {error || "Please use the join link your teacher shared to access this class."}
        </p>
      </div>
    )
  }

  // ── Main join screen (name entry only) ──────────────────────────
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>

      {/* Page heading */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{
          fontSize    : "11px",
          letterSpacing: "1px",
          color       : "#E87722",
          fontFamily  : "Arial",
          fontWeight  : "bold",
          marginBottom: "8px",
        }}>
          SHIKHA ACADEMY
        </p>
        <h1 style={{
          fontSize    : "28px",
          fontWeight  : "bold",
          color       : "#1A5276",
          fontFamily  : "Arial",
          marginBottom: "8px",
        }}>
          Join Your Class
        </h1>
      </div>

      {/* Unit info card */}
      <div className="dark-card" style={{ marginBottom: "16px" }}>
        <p style={{
          color       : "rgba(255,255,255,0.65)",
          fontSize    : "12px",
          fontFamily  : "Arial",
          marginBottom: "4px",
        }}>
          You are joining
        </p>
        <p style={{
          color       : "white",
          fontWeight  : "bold",
          fontSize    : "20px",
          fontFamily  : "Arial",
          marginBottom: "4px",
        }}>
          {classInfo.unit_input?.chapter}
        </p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", fontFamily: "Arial" }}>
          {classInfo.unit_input?.grade} · {classInfo.unit_input?.subject}
          {classInfo.unit_input?.context && classInfo.unit_input.context !== "general"
            ? ` · ${classInfo.unit_input.context}`
            : ""}
        </p>
      </div>

      {/* Name entry card */}
      <div className="card">
        <label style={{
          display     : "block",
          marginBottom: "6px",
          fontWeight  : "bold",
          fontSize    : "13px",
          color       : "#1A5276",
          fontFamily  : "Arial",
        }}>
          Your Name
        </label>
        <input
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={e => { setName(e.target.value); setError("") }}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          style={{
            width      : "100%",
            padding    : "12px",
            borderRadius: "8px",
            border     : "2px solid #BDC3C7",
            fontFamily : "Arial",
            fontSize   : "16px",
            marginBottom: "16px",
            boxSizing  : "border-box",
          }}
          autoFocus
        />
        {error && (
          <p style={{
            color       : "#C0392B",
            fontSize    : "13px",
            marginBottom: "12px",
            fontFamily  : "Arial",
          }}>
            {error}
          </p>
        )}
        <button
          className="btn-primary"
          onClick={handleJoin}
          disabled={joining}
          style={{ width: "100%", padding: "14px" }}
        >
          {joining ? "Joining..." : "Start Learning →"}
        </button>
      </div>

    </div>
  )
}
