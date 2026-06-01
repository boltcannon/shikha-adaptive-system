import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

// These keys match what /unit/generate-all stores in session["generated_content"]
const EDITABLE_TEMPLATES = [
  { key: "provocation",    label: "Provocation" },
  { key: "ncl_1",          label: "NCL — Subtopic 1" },
  { key: "ncl_2",          label: "NCL — Subtopic 2" },
  { key: "analysis",       label: "Analysis" },
  { key: "discussion",     label: "Discussion" },
  { key: "reflection",     label: "Reflection" },
]

export default function TeacherSharePanel({ onClose, onStartStudentView }) {
  const { sessionId, unitInput, generatedContent } = useUnit()

  const [classCode,       setClassCode]       = useState(null)
  const [creating,        setCreating]        = useState(false)
  const [copied,          setCopied]          = useState("")
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editContent,     setEditContent]     = useState("")
  const [editError,       setEditError]       = useState("")
  const [saving,          setSaving]          = useState(false)

  const createClass = async () => {
    setCreating(true)
    try {
      const result = await api.createClass(sessionId)
      setClassCode(result.class_code)
    } catch (e) {
      // ignore — user can retry
    }
    setCreating(false)
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(""), 2000)
    })
  }

  const startEditing = (key) => {
    const content = generatedContent?.[key]
    if (!content) return
    setEditingTemplate(key)
    setEditContent(JSON.stringify(content, null, 2))
    setEditError("")
  }

  const saveEdit = async () => {
    if (!classCode) return
    let parsed
    try {
      parsed = JSON.parse(editContent)
    } catch (e) {
      setEditError("Invalid JSON — please check your edits and try again.")
      return
    }
    setSaving(true)
    try {
      await api.updateContent(classCode, editingTemplate, parsed)
      setEditingTemplate(null)
      setEditError("")
    } catch (e) {
      setEditError("Save failed. Is the backend running?")
    }
    setSaving(false)
  }

  const joinLink = classCode
    ? `${window.location.origin}/join/${classCode}`
    : ""

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "16px"
    }}>
      <div style={{
        background: "white", borderRadius: "16px",
        padding: "32px", maxWidth: "600px", width: "100%",
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#1A5276", fontFamily: "Arial" }}>
            Share with Your Class
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#95A5A6", lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        {/* Unit info pill */}
        {unitInput && (
          <div style={{
            background: "#EBF5FB", borderRadius: "8px", padding: "10px 14px",
            marginBottom: "20px", display: "flex", gap: "12px", flexWrap: "wrap"
          }}>
            {[unitInput.grade, unitInput.subject, unitInput.chapter,
              unitInput.context !== "general" ? unitInput.context : null]
              .filter(Boolean)
              .map((v, i) => (
                <span key={i} style={{ fontFamily: "Arial", fontSize: "13px", color: "#1A5276" }}>
                  {i > 0 && <span style={{ color: "#BDC3C7", marginRight: "12px" }}>·</span>}
                  {v}
                </span>
              ))}
          </div>
        )}

        {/* Step: create class */}
        {!classCode ? (
          <div>
            <p style={{ color: "#5D6D7E", fontFamily: "Arial", fontSize: "14px", marginBottom: "20px", lineHeight: "1.6" }}>
              Create a class so students can join with a 6-character code or a direct link.
              Their progress will be saved automatically to MongoDB.
            </p>
            <button
              className="btn-primary"
              onClick={createClass}
              disabled={creating}
              style={{ width: "100%", padding: "14px" }}
            >
              {creating ? "Creating class..." : "Create Class Code →"}
            </button>
          </div>
        ) : (
          <div>
            {/* Class code display */}
            <div style={{
              background: "#1A5276", borderRadius: "12px",
              padding: "24px", textAlign: "center", marginBottom: "16px"
            }}>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "11px", fontFamily: "Arial", letterSpacing: "1px", marginBottom: "8px" }}>
                CLASS CODE
              </p>
              <p style={{ color: "white", fontSize: "42px", fontWeight: "bold", fontFamily: "Arial", letterSpacing: "10px", marginBottom: "16px" }}>
                {classCode}
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  onClick={() => copyToClipboard(classCode, "code")}
                  style={{
                    background: "rgba(255,255,255,0.15)", color: "white",
                    border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px",
                    padding: "8px 16px", cursor: "pointer", fontFamily: "Arial", fontSize: "13px"
                  }}
                >
                  {copied === "code" ? "Copied! ✓" : "Copy Code"}
                </button>
                <button
                  onClick={() => copyToClipboard(joinLink, "link")}
                  style={{
                    background: "#E87722", color: "white",
                    border: "none", borderRadius: "8px",
                    padding: "8px 16px", cursor: "pointer", fontFamily: "Arial", fontSize: "13px"
                  }}
                >
                  {copied === "link" ? "Copied! ✓" : "Copy Link"}
                </button>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", textAlign: "center", marginBottom: "24px" }}>
              Students go to <strong style={{ color: "#1A5276" }}>{joinLink}</strong> or enter the code above.
            </p>

            {/* Edit AI content */}
            <div style={{ borderTop: "1px solid #F2F3F4", paddingTop: "20px" }}>
              <p style={{ fontWeight: "bold", fontSize: "14px", color: "#1A5276", fontFamily: "Arial", marginBottom: "6px" }}>
                Review and Edit Content
              </p>
              <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "16px" }}>
                Check what the AI generated before students see it. Edit anything that needs changing.
              </p>

              {EDITABLE_TEMPLATES.map(t => {
                const hasContent = !!(generatedContent?.[t.key])
                return (
                  <div key={t.key} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0", borderBottom: "1px solid #F2F3F4"
                  }}>
                    <span style={{ fontFamily: "Arial", fontSize: "14px", color: hasContent ? "#2C3E50" : "#BDC3C7" }}>
                      {t.label} {hasContent ? "✓" : "(not generated)"}
                    </span>
                    {hasContent && (
                      <button
                        onClick={() => startEditing(t.key)}
                        style={{
                          background: "#F2F3F4", border: "none", borderRadius: "6px",
                          padding: "6px 12px", cursor: "pointer", fontFamily: "Arial",
                          fontSize: "12px", color: "#1A5276", fontWeight: "bold"
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Inline JSON editor */}
            {editingTemplate && (
              <div style={{ marginTop: "20px", background: "#F8F9FA", borderRadius: "8px", padding: "16px" }}>
                <p style={{ fontWeight: "bold", fontSize: "13px", color: "#1A5276", fontFamily: "Arial", marginBottom: "6px" }}>
                  Editing: {EDITABLE_TEMPLATES.find(t => t.key === editingTemplate)?.label}
                </p>
                <p style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "8px" }}>
                  Edit the JSON below. Keep the same structure — only change the text values.
                </p>
                <textarea
                  value={editContent}
                  onChange={e => { setEditContent(e.target.value); setEditError("") }}
                  style={{
                    width: "100%", height: "220px", padding: "10px",
                    borderRadius: "6px", border: "1px solid #BDC3C7",
                    fontFamily: "Courier New, monospace", fontSize: "12px",
                    resize: "vertical", boxSizing: "border-box"
                  }}
                />
                {editError && (
                  <p style={{ color: "#C0392B", fontFamily: "Arial", fontSize: "12px", marginTop: "4px" }}>
                    {editError}
                  </p>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="btn-primary"
                    style={{ padding: "8px 20px" }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(null); setEditError("") }}
                    className="btn-secondary"
                    style={{ padding: "8px 20px" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onStartStudentView}
              className="btn-orange"
              style={{ width: "100%", padding: "14px", marginTop: "20px" }}
            >
              Preview as Student →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
