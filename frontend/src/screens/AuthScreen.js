import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

export default function AuthScreen({ onNavigate }) {
  const { login } = useUnit()

  const [tab,     setTab]     = useState("login")
  const [role,    setRole]    = useState("teacher")
  const [form,    setForm]    = useState({ name: "", email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  const [backendReady,    setBackendReady]    = useState(false)
  const [backendChecking, setBackendChecking] = useState(true)

  useEffect(() => {
    const checkBackend = async () => {
      const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
      try {
        const r = await fetch(`${BASE_URL}/ping`, {
          signal: AbortSignal.timeout(5000),
        })
        setBackendReady(r.ok)
      } catch (e) {
        setBackendReady(false)
      }
      setBackendChecking(false)
    }
    checkBackend()
  }, [])

  const handleSubmit = async () => {
    setError("")
    if (!form.email || !form.password) {
      setError("Please fill in all fields")
      return
    }
    if (tab === "register" && !form.name) {
      setError("Please enter your name")
      return
    }
    setLoading(true)
    try {
      const result = tab === "login"
        ? await api.login(form.email, form.password)
        : await api.register(form.name, form.email, form.password, role)

      if (result.token) {
        login(
          { user_id: result.user_id, name: result.name, email: result.email, role: result.role },
          result.token
        )
        onNavigate("teacherInput")
      } else {
        setError(result.detail || "Something went wrong")
      }
    } catch (e) {
      setError("Connection failed. Is the server running?")
    }
    setLoading(false)
  }

  const inputStyle = {
    width: "100%", padding: "10px", borderRadius: "8px",
    border: "1px solid #BDC3C7", fontFamily: "Arial", fontSize: "14px",
  }

  const labelStyle = {
    display: "block", marginBottom: "6px",
    fontWeight: "bold", fontSize: "13px",
    color: "#1A5276", fontFamily: "Arial",
  }

  return (
    <div style={{ maxWidth: "440px", margin: "0 auto", padding: "40px 16px 0" }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{
          fontSize: "13px", color: "#E87722", fontFamily: "Arial",
          fontWeight: "bold", letterSpacing: "2px", marginBottom: "8px",
        }}>
          SHIKHA ACADEMY
        </p>
        <h1 style={{
          fontSize: "28px", fontWeight: "bold", color: "#1A5276",
          fontFamily: "Arial", marginBottom: "4px",
        }}>
          Adaptive Learning Framework
        </h1>
        <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial" }}>
          Sign in to continue
        </p>
      </div>

      {/* Backend status banners */}
      {backendChecking && (
        <div style={{
          background   : "#FEF9E7",
          border       : "1px solid #B7950B",
          borderRadius : "8px",
          padding      : "10px 16px",
          marginBottom : "16px",
          textAlign    : "center",
        }}>
          <p style={{ fontSize: "13px", color: "#B7950B", fontFamily: "Arial", margin: 0 }}>
            ⏳ Starting up the server...
          </p>
        </div>
      )}

      {!backendChecking && !backendReady && (
        <div style={{
          background   : "#FADBD8",
          border       : "1px solid #C0392B",
          borderRadius : "8px",
          padding      : "10px 16px",
          marginBottom : "16px",
          textAlign    : "center",
        }}>
          <p style={{ fontSize: "13px", color: "#C0392B", fontFamily: "Arial", margin: 0 }}>
            Server is starting up. Please wait 30 seconds and try again.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{
        display: "flex", background: "#F2F3F4",
        borderRadius: "10px", padding: "4px", marginBottom: "24px",
      }}>
        {["login", "register"].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError("") }}
            style={{
              flex: 1, padding: "10px",
              background: tab === t ? "white" : "transparent",
              border: "none", borderRadius: "8px", cursor: "pointer",
              fontFamily: "Arial", fontSize: "14px",
              fontWeight: tab === t ? "bold" : "normal",
              color: tab === t ? "#1A5276" : "#5D6D7E",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            {t === "login" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      <div className="card">
        {/* Role selector — register only */}
        {tab === "register" && (
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>I am a</label>
            <div style={{ display: "flex", gap: "10px" }}>
              {["teacher", "student"].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: "12px",
                    background: role === r ? "#1A5276" : "white",
                    color: role === r ? "white" : "#2C3E50",
                    border: `2px solid ${role === r ? "#1A5276" : "#BDC3C7"}`,
                    borderRadius: "8px", cursor: "pointer",
                    fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
                    textTransform: "capitalize",
                  }}
                >
                  {r === "teacher" ? "Teacher" : "Student"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Name — register only */}
        {tab === "register" && (
          <div style={{ marginBottom: "12px" }}>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={inputStyle}
          />
        </div>

        {error && (
          <p style={{ color: "#C0392B", fontSize: "13px", fontFamily: "Arial", marginBottom: "12px" }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ width: "100%", padding: "14px" }}
        >
          {loading ? "Please wait..." : tab === "login" ? "Sign In →" : "Create Account →"}
        </button>

        <p style={{
          textAlign: "center", marginTop: "16px",
          fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial",
        }}>
          {tab === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setTab(tab === "login" ? "register" : "login"); setError("") }}
            style={{
              background: "none", border: "none",
              color: "#1A5276", cursor: "pointer",
              fontWeight: "bold", fontFamily: "Arial", fontSize: "13px",
            }}
          >
            {tab === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>

    </div>
  )
}
