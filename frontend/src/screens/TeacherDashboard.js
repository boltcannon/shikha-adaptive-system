import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

const TEMPLATE_KEY_MAP = {
  "Provocation"                    : "provocation",
  "New Content Learning"           : "ncl",
  "Analysis"                       : "analysis",
  "Discussion"                     : "discussion",
  "Mastery Gate"                   : "masteryGate",
  "Project Planning"               : "projectPlanning",
  "Research and Artifact Creation" : "rac",
  "Reflection and Celebration"     : "reflection"
}

const TABS = ["Progress", "Class Results"]

// Colour-coded status badge
function StatusBadge({ student }) {
  const done  = student.progress?.reflection_done
  const count = student.progress?.completed_templates?.length || 0
  const color   = done ? "#1E8449" : count >= 5 ? "#E87722" : "#C0392B"
  const bg      = done ? "#D5F5E3" : count >= 5 ? "#FEF9E7" : "#FADBD8"
  const label   = done ? "Complete" : count >= 5 ? "In Progress" : "Just Started"
  return (
    <span style={{
      background: bg, color, borderRadius: "12px",
      padding: "3px 10px", fontSize: "12px",
      fontFamily: "Arial", fontWeight: "bold"
    }}>
      {label}
    </span>
  )
}

export default function TeacherDashboard({ onBack }) {
  const { unitInput, sessionId, performance } = useUnit()
  const [activeTab, setActiveTab]   = useState("Progress")
  const [codeInput, setCodeInput]   = useState("")
  const [results,   setResults]     = useState(null)
  const [fetching,  setFetching]    = useState(false)
  const [fetchError, setFetchError] = useState("")

  const fetchResults = async () => {
    const code = codeInput.trim().toUpperCase()
    if (!code) { setFetchError("Enter a class code"); return }
    setFetching(true)
    setFetchError("")
    try {
      const data = await api.getClassResults(code)
      if (data.detail) throw new Error(data.detail)
      setResults(data)
    } catch (e) {
      setFetchError(e.message || "Could not fetch results. Is the backend running?")
    }
    setFetching(false)
  }

  const tabStyle = (tab) => ({
    padding: "8px 20px",
    borderRadius: "20px",
    border: "none",
    cursor: "pointer",
    fontFamily: "Arial",
    fontSize: "13px",
    fontWeight: activeTab === tab ? "bold" : "normal",
    background: activeTab === tab ? "#1A5276" : "#F2F3F4",
    color: activeTab === tab ? "white" : "#5D6D7E",
    transition: "all 0.15s"
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 className="heading-1">Teacher Dashboard</h1>
        <button className="btn-secondary" onClick={onBack}>← Student View</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {TABS.map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB: Progress ───────────────────────────────── */}
      {activeTab === "Progress" && (
        <>
          {!sessionId ? (
            <div className="card">
              <p className="subtext">No active unit. Switch to Student View to generate one.</p>
            </div>
          ) : (
            <>
              <div className="card">
                <h2 className="heading-2" style={{ marginBottom: "16px" }}>Active Unit</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    ["Grade",   unitInput?.grade],
                    ["Subject", unitInput?.subject],
                    ["Chapter", unitInput?.chapter],
                    ["Context", unitInput?.context]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "2px" }}>{label}</p>
                      <p style={{ fontSize: "14px", fontWeight: "bold", fontFamily: "Arial", color: "#2C3E50" }}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: "12px", fontSize: "12px", color: "#95A5A6", fontFamily: "Arial" }}>
                  Session: {sessionId}
                </p>
              </div>

              <div className="card">
                <h2 className="heading-2" style={{ marginBottom: "16px" }}>Student Progress</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.keys(TEMPLATE_KEY_MAP).map(t => {
                    const done = performance.completedTemplates.includes(TEMPLATE_KEY_MAP[t])
                    return (
                      <div key={t} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", borderRadius: "8px",
                        background: done ? "#D5F5E3" : "#F8F9FA",
                        border: `1px solid ${done ? "#1E8449" : "#E5E7E9"}`
                      }}>
                        <span style={{ fontFamily: "Arial", fontSize: "14px", color: done ? "#1E8449" : "#5D6D7E" }}>{t}</span>
                        <span style={{ fontFamily: "Arial", fontSize: "13px", fontWeight: "bold", color: done ? "#1E8449" : "#BDC3C7" }}>
                          {done ? "✓ Done" : "Pending"}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {performance.exitTicketScore && (
                <div className="card">
                  <h2 className="heading-2" style={{ marginBottom: "12px" }}>Performance Summary</h2>
                  <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50" }}>
                    Exit Ticket: <strong>{performance.exitTicketScore}</strong>
                  </p>
                  {performance.masteryGateResult && (
                    <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", marginTop: "4px" }}>
                      Mastery Gate: <strong>{performance.masteryGateResult}</strong>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── TAB: Class Results ──────────────────────────── */}
      {activeTab === "Class Results" && (
        <div>
          {/* Code lookup */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#1A5276", marginBottom: "8px" }}>
              Enter Class Code
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="e.g. ABC-123"
                value={codeInput}
                onChange={e => { setCodeInput(e.target.value.toUpperCase()); setFetchError("") }}
                onKeyDown={e => e.key === "Enter" && fetchResults()}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: "1px solid #BDC3C7", fontFamily: "Arial",
                  fontSize: "15px", letterSpacing: "3px", fontWeight: "bold"
                }}
              />
              <button
                className="btn-primary"
                onClick={fetchResults}
                disabled={fetching}
                style={{ padding: "10px 20px", whiteSpace: "nowrap" }}
              >
                {fetching ? "Loading..." : "Get Results"}
              </button>
            </div>
            {fetchError && (
              <p style={{ color: "#C0392B", fontFamily: "Arial", fontSize: "13px", marginTop: "8px" }}>
                {fetchError}
              </p>
            )}
          </div>

          {/* Results */}
          {results && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 className="heading-2">Class {results.class_code}</h2>
              </div>

              {/* Summary stats */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                {[
                  { label: "Total Students", value: results.total_students,  color: "#1A5276" },
                  { label: "Complete",        value: results.complete ?? 0,   color: "#1E8449" },
                  { label: "In Progress",     value: results.in_progress ?? 0, color: "#B7950B" },
                ].map(stat => (
                  <div key={stat.label} style={{
                    flex: 1, background: "white", borderRadius: "8px",
                    padding: "12px", textAlign: "center",
                    border: `2px solid ${stat.color}30`,
                  }}>
                    <p style={{ fontSize: "28px", fontWeight: "bold", color: stat.color, fontFamily: "Arial", margin: 0 }}>
                      {stat.value}
                    </p>
                    <p style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial", margin: 0 }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {results.students.length === 0 ? (
                <p style={{ fontFamily: "Arial", color: "#95A5A6", fontSize: "14px" }}>
                  No students have joined this class yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#1A5276" }}>
                        {["Student Name", "Templates Done", "Exit Ticket", "Mastery Gate", "Status"].map(h => (
                          <th key={h} style={{
                            padding: "10px 12px", textAlign: "left",
                            color: "white", fontWeight: "bold", fontSize: "12px"
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.students.map((s, i) => {
                        const p        = s.progress || {}
                        const doneCount = p.completed_templates?.length || 0
                        return (
                          <tr key={s.student_id} style={{ background: i % 2 === 0 ? "white" : "#F8F9FA" }}>
                            <td style={{ padding: "10px 12px", fontWeight: "500", color: "#2C3E50" }}>
                              {s.student_name}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#5D6D7E" }}>
                              {doneCount} / 8
                            </td>
                            <td style={{ padding: "10px 12px", color: "#5D6D7E" }}>
                              {p.exit_ticket_score || "—"}
                            </td>
                            <td style={{ padding: "10px 12px", color: "#5D6D7E" }}>
                              {p.mastery_gate_result || "—"}
                            </td>
                            <td style={{ padding: "10px 12px" }}>
                              <StatusBadge student={s} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
