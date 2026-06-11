import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import CHAPTERS from "../data/chapters"

const GRADES = [
  "Class 1", "Class 2", "Class 3", "Class 4",
  "Class 5", "Class 6", "Class 7", "Class 8",
  "Class 9", "Class 10", "Class 11", "Class 12"
]

const DEFAULT_CONTEXTS = [
  "Cricket", "Football", "Cooking", "Space",
  "Farming", "Movies", "Music", "Technology"
]

export default function TeacherInput({ onNavigate }) {
  const {
    sessionId, setSessionId, setUnitInput,
    setGeneratedContent, setPerformance, clearStudentSession,
    currentUser,
  } = useUnit()

  const [form, setForm] = useState({
    grade: "Class 6", subject: "", chapter: "", context: "",
  })
  const [noContext, setNoContext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Dynamic context suggestions
  const [contextSuggestions, setContextSuggestions] = useState(DEFAULT_CONTEXTS)
  const [loadingContexts, setLoadingContexts] = useState(false)

  const availableSubjects = CHAPTERS[form.grade]
    ? Object.keys(CHAPTERS[form.grade])
    : []
  const availableChapters = CHAPTERS[form.grade]?.[form.subject] || []

  // ── Fetch context suggestions when chapter is selected ──
  const fetchContextSuggestions = async (grade, subject, chapter) => {
    if (!chapter) return

    // Check localStorage cache — avoids a 3-8s Claude call for repeat visits
    const cacheKey = `ctx_${grade}_${subject}_${chapter}`.replace(/\s+/g, "_")
    const cached   = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        setContextSuggestions(JSON.parse(cached))
        setForm(prev => ({ ...prev, context: "" }))
        return
      } catch (e) { /* bad entry — fall through */ }
    }

    setLoadingContexts(true)
    try {
      const result = await api.getContextSuggestions(grade, subject, chapter)
      if (result.contexts && result.contexts.length > 0) {
        setContextSuggestions(result.contexts)
        // Clear any previously selected context so the teacher
        // consciously picks from the chapter-specific suggestions
        setForm(prev => ({ ...prev, context: "" }))
        // Cache for instant retrieval next time
        localStorage.setItem(cacheKey, JSON.stringify(result.contexts))
      }
    } catch (e) {
      console.log("Could not load context suggestions")
    }
    setLoadingContexts(false)
  }

  const handleNoContextToggle = (checked) => {
    setNoContext(checked)
    setForm(prev => ({ ...prev, context: checked ? "general" : "" }))
  }

  const handleGenerate = async () => {
    if (!form.chapter) {
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
    width: "100%", padding: "10px", borderRadius: "8px",
    border: "1px solid #BDC3C7", fontFamily: "Arial",
    fontSize: "14px", appearance: "auto",
  }

  const labelStyle = {
    display: "block", marginBottom: "6px",
    fontWeight: "bold", fontSize: "13px", color: "#1A5276",
  }

  return (
    <div>
      <div style={{ marginBottom: "32px" }}>
        <h1 className="heading-1">
          {currentUser?.role === "teacher" ? "Create a Learning Unit" : "Start Learning"}
        </h1>
        <p className="subtext">
          {currentUser?.role === "teacher"
            ? "Select grade, subject and chapter. The AI will generate a complete unit using Shikha's MAT framework."
            : "Select your grade, subject and chapter. The AI will create a personalised learning unit just for you."
          }
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
              subject: "",
              chapter: "",
            })}
            style={selectStyle}
          >
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* ── Subject ───────────────────────────────────────── */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Subject</label>
          <select
            value={form.subject}
            onChange={e => {
              setForm({ ...form, subject: e.target.value, chapter: "" })
              // Reset suggestions to defaults when subject changes
              setContextSuggestions(DEFAULT_CONTEXTS)
            }}
            style={{
              ...selectStyle,
              background: availableSubjects.length === 0 ? "#F2F3F4" : "white",
              color: form.subject ? "#2C3E50" : "#95A5A6",
            }}
          >
            <option value="">Select a subject...</option>
            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
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
            onChange={e => {
              const newChapter = e.target.value
              setForm({ ...form, chapter: newChapter })
              if (newChapter && form.grade && form.subject) {
                fetchContextSuggestions(form.grade, form.subject, newChapter)
              } else {
                setContextSuggestions(DEFAULT_CONTEXTS)
              }
            }}
            disabled={!form.subject || availableChapters.length === 0}
            style={{
              ...selectStyle,
              background: (!form.subject || availableChapters.length === 0)
                ? "#F2F3F4" : "white",
              color: form.chapter ? "#2C3E50" : "#95A5A6",
              cursor: (!form.subject || availableChapters.length === 0)
                ? "not-allowed" : "pointer",
            }}
          >
            <option value="">
              {!form.subject ? "Select a subject first..." : "Select a chapter..."}
            </option>
            {availableChapters.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </div>

        {/* ── Context ───────────────────────────────────────── */}
        <div style={{ marginBottom: "24px" }}>
          {/* Header row: label + loading indicator */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "8px",
          }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Context
              <span style={{ fontWeight: "normal", color: "#95A5A6", marginLeft: "6px" }}>
                (optional)
              </span>
            </label>
            {loadingContexts && (
              <span style={{
                fontSize: "11px", color: "#E87722",
                fontFamily: "Arial", fontStyle: "italic",
              }}>
                Updating suggestions...
              </span>
            )}
          </div>

          {/* Dynamic suggestion pills */}
          <div style={{
            display: "flex", flexWrap: "wrap",
            gap: "8px", marginBottom: "10px",
          }}>
            {contextSuggestions.map(ctx => (
              <button
                key={ctx}
                onClick={() => {
                  if (noContext) return
                  setForm(prev => ({
                    ...prev,
                    context: prev.context === ctx ? "" : ctx,
                  }))
                }}
                disabled={noContext}
                style={{
                  padding: "5px 14px",
                  borderRadius: "20px",
                  border: `2px solid ${
                    !noContext && form.context === ctx ? "#E87722" : "#BDC3C7"
                  }`,
                  background: !noContext && form.context === ctx
                    ? "#E87722" : "white",
                  color: !noContext && form.context === ctx
                    ? "white" : "#5D6D7E",
                  cursor: noContext ? "not-allowed" : "pointer",
                  fontFamily: "Arial",
                  fontSize: "13px",
                  fontWeight: !noContext && form.context === ctx ? "bold" : "normal",
                  opacity: noContext || loadingContexts ? 0.5 : 1,
                  transition: "all 0.15s",
                }}
              >
                {ctx}
              </button>
            ))}
          </div>

          {/* Custom context free-text input */}
          <input
            type="text"
            placeholder="Or type your own context..."
            value={noContext ? "" : form.context}
            disabled={noContext}
            onChange={e => setForm({ ...form, context: e.target.value })}
            style={{
              width: "100%", padding: "8px 12px",
              borderRadius: "8px", border: "1px solid #BDC3C7",
              fontFamily: "Arial", fontSize: "13px",
              color: "#2C3E50", marginBottom: "10px",
              background: noContext ? "#F2F3F4" : "white",
              cursor: noContext ? "not-allowed" : "text",
              boxSizing: "border-box",
            }}
          />

          {/* No-context checkbox */}
          <label style={{
            display: "flex", alignItems: "center",
            gap: "8px", cursor: "pointer", marginBottom: "8px",
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
            Suggestions update automatically when you select a chapter.
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
            width: "100%", padding: "14px", fontSize: "15px",
            opacity: (!form.chapter && !loading) ? 0.5 : 1,
            cursor: !form.chapter ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Creating unit..." : "Generate Unit with AI →"}
        </button>

        {sessionId && (
          <button
            onClick={() => {
              setSessionId(null)
              setUnitInput(null)
              setGeneratedContent(null)
              setPerformance({
                exitTicketScore: null, masteryGateResult: null,
                projectIdea: "", completedTemplates: [],
              })
              clearStudentSession()
            }}
            style={{
              width: "100%", padding: "10px",
              background: "white", color: "#5D6D7E",
              border: "1px solid #BDC3C7", borderRadius: "8px",
              cursor: "pointer", fontFamily: "Arial",
              fontSize: "13px", marginTop: "8px",
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
