import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import CHAPTERS from "../data/chapters"

const GRADES = [
  "Class 1", "Class 2", "Class 3", "Class 4",
  "Class 5", "Class 6", "Class 7", "Class 8",
  "Class 9", "Class 10", "Class 11", "Class 12"
]

const CONTEXT_SUGGESTIONS = [
  "Cricket", "Football", "Cooking", "Space", "Farming",
  "Movies", "Music", "Fashion", "Technology", "Travel"
]

export default function TeacherInput({ onNavigate }) {
  const { sessionId, setSessionId, setUnitInput, setGeneratedContent } = useUnit()
  const [form, setForm] = useState({
    grade: "Class 6",
    subject: "",
    chapter: "",
    context: ""
  })
  const [noContext, setNoContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Derive available subjects and chapters from the selected grade/subject
  const availableSubjects = CHAPTERS[form.grade]
    ? Object.keys(CHAPTERS[form.grade])
    : []

  const availableChapters = CHAPTERS[form.grade]?.[form.subject] || []

  const handleNoContextToggle = (checked) => {
    setNoContext(checked)
    setForm(prev => ({ ...prev, context: checked ? "general" : "" }))
  }

  const handleGenerate = async () => {
    if (!form.chapter || form.chapter === "") {
      setError("Please select a chapter")
      return
    }
    setLoading(true)
    setError("")
    try {
      const result = await api.createUnit(form)
      setSessionId(result.session_id)
      setUnitInput(form)
      onNavigate("unitLoader")
    } catch (e) {
      setError("Could not connect to server. Is the backend running?")
    }
    setLoading(false)
  }

  const selectStyle = {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #BDC3C7",
    fontFamily: "Arial",
    fontSize: "14px",
    appearance: "auto"
  }

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontWeight: "bold",
    fontSize: "13px",
    color: "#1A5276"
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="heading-1">Adaptive Learning Framework</h1>
        <p className="subtext">
          Select a grade, subject and chapter below. The system will generate a
          complete learning unit using Shikha's MAT framework — Provocation
          through Reflection.
        </p>
      </div>

      <div className="card">
        {/* ── Grade ─────────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Grade</label>
          <select
            value={form.grade}
            onChange={e => setForm({
              ...form,
              grade: e.target.value,
              subject: "",   // reset subject when grade changes
              chapter: ""    // reset chapter when grade changes
            })}
            style={selectStyle}
          >
            {GRADES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* ── Subject ───────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Subject</label>
          <select
            value={form.subject}
            onChange={e => setForm({
              ...form,
              subject: e.target.value,
              chapter: ""    // reset chapter when subject changes
            })}
            style={{
              ...selectStyle,
              background: availableSubjects.length === 0 ? "#F2F3F4" : "white",
              color: form.subject ? "#2C3E50" : "#95A5A6"
            }}
          >
            <option value="">Select a subject...</option>
            {availableSubjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {availableSubjects.length === 0 && (
            <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#95A5A6", marginTop: "4px" }}>
              No subjects available for this grade.
            </p>
          )}
        </div>

        {/* ── Chapter ───────────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>
            Chapter
            {availableChapters.length > 0 && (
              <span style={{ fontWeight: "normal", color: "#95A5A6", marginLeft: "6px" }}>
                ({availableChapters.length} chapters)
              </span>
            )}
          </label>
          <select
            value={form.chapter}
            onChange={e => setForm({ ...form, chapter: e.target.value })}
            disabled={!form.subject || availableChapters.length === 0}
            style={{
              ...selectStyle,
              background: (!form.subject || availableChapters.length === 0)
                ? "#F2F3F4" : "white",
              color: form.chapter ? "#2C3E50" : "#95A5A6",
              cursor: (!form.subject || availableChapters.length === 0)
                ? "not-allowed" : "pointer"
            }}
          >
            <option value="">
              {!form.subject
                ? "Select a subject first..."
                : "Select a chapter..."}
            </option>
            {availableChapters.map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        </div>

        {/* ── Context ───────────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>
            Context
            <span style={{ fontWeight: "normal", color: "#95A5A6", marginLeft: "6px" }}>
              (optional)
            </span>
          </label>
          <input
            type="text"
            placeholder="e.g. Cricket, Cooking, Space... (optional)"
            value={noContext ? "" : form.context}
            disabled={noContext}
            onChange={e => setForm({ ...form, context: e.target.value })}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #BDC3C7",
              fontFamily: "Arial",
              fontSize: "14px",
              marginBottom: "8px",
              background: noContext ? "#F2F3F4" : "white",
              color: noContext ? "#95A5A6" : "#2C3E50",
              cursor: noContext ? "not-allowed" : "text"
            }}
          />

          {/* Suggestion pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            {CONTEXT_SUGGESTIONS.map(c => (
              <button
                key={c}
                onClick={() => !noContext && setForm({ ...form, context: c })}
                disabled={noContext}
                style={{
                  background: !noContext && form.context === c ? "#E87722" : "#F2F3F4",
                  color: !noContext && form.context === c ? "white" : "#95A5A6",
                  border: "none",
                  borderRadius: "16px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  cursor: noContext ? "not-allowed" : "pointer",
                  fontFamily: "Arial",
                  opacity: noContext ? 0.45 : 1,
                  transition: "opacity 0.2s"
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* No-context checkbox */}
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            marginBottom: "8px"
          }}>
            <input
              type="checkbox"
              checked={noContext}
              onChange={e => handleNoContextToggle(e.target.checked)}
              style={{ width: "15px", height: "15px", cursor: "pointer" }}
            />
            <span style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E" }}>
              No specific context — use general examples
            </span>
          </label>

          <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#95A5A6", lineHeight: "1.5" }}>
            The AI will connect all learning to this context.
            Leave blank or check 'No context' for general examples.
          </p>
        </div>

        {error && (
          <p style={{ color: "#C0392B", fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={loading || !form.chapter}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            opacity: (!form.chapter && !loading) ? 0.5 : 1,
            cursor: !form.chapter ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Creating unit..." : "Generate Unit with AI →"}
        </button>

        {/* Fix 1 — clear existing session so teacher can start fresh */}
        {sessionId && (
          <button
            onClick={() => {
              setSessionId(null)
              setUnitInput(null)
              setGeneratedContent(null)
            }}
            style={{
              width       : "100%",
              padding     : "10px",
              background  : "white",
              color       : "#5D6D7E",
              border      : "1px solid #BDC3C7",
              borderRadius: "8px",
              cursor      : "pointer",
              fontFamily  : "Arial",
              fontSize    : "13px",
              marginTop   : "8px",
            }}
          >
            Clear current unit and start fresh
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="card" style={{ background: "#EBF5FB", border: "none" }}>
        <p style={{ fontWeight: "bold", color: "#1A5276", marginBottom: "8px", fontSize: "13px" }}>
          How it works
        </p>
        <p className="subtext">
          The AI reads Shikha Academy's complete MAT framework and generates a full
          learning unit — Provocation, New Content Learning, Analysis, Discussion,
          Mastery Gate, Project Planning, Research and Artifact Creation, and
          Reflection — all connected to your context. Every question is generated
          fresh. Every answer is checked by AI.
        </p>
      </div>
    </div>
  )
}
