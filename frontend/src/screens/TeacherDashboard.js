import React, { useEffect, useState } from "react"
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
  "Reflection and Celebration"     : "reflection",
}

const TABS = ["My Classes", "Class Results", "Progress"]

function StatusBadge({ student }) {
  const done  = student.progress?.reflection_done
  const count = student.progress?.completed_templates?.length || 0
  const color = done ? "#1E8449" : count >= 5 ? "#E87722" : "#C0392B"
  const bg    = done ? "#D5F5E3" : count >= 5 ? "#FEF9E7" : "#FADBD8"
  const label = done ? "Complete" : count >= 5 ? "In Progress" : "Just Started"
  return (
    <span style={{
      background: bg, color, borderRadius: "12px",
      padding: "3px 10px", fontSize: "12px",
      fontFamily: "Arial", fontWeight: "bold",
    }}>
      {label}
    </span>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: "white", borderRadius: "8px",
      padding: "12px", textAlign: "center",
      border: `2px solid ${color}30`, minWidth: "80px",
    }}>
      <p style={{ fontSize: "28px", fontWeight: "bold", color, fontFamily: "Arial", margin: 0 }}>
        {value ?? "—"}
      </p>
      <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial", margin: 0 }}>
        {label}
      </p>
    </div>
  )
}

export default function TeacherDashboard({ onBack }) {
  const { unitInput, sessionId, performance, token } = useUnit()
  const [activeTab, setActiveTab] = useState("My Classes")

  // ── My Classes state ──────────────────────────────────────────
  const [myClasses,      setMyClasses]      = useState([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [classesError,   setClassesError]   = useState("")

  // ── Class Results state ───────────────────────────────────────
  const [codeInput,  setCodeInput]  = useState("")
  const [results,    setResults]    = useState(null)
  const [fetching,   setFetching]   = useState(false)
  const [fetchError, setFetchError] = useState("")

  // Load teacher's classes on mount
  useEffect(() => {
    if (token) loadMyClasses()
  }, [token]) // eslint-disable-line

  const loadMyClasses = async () => {
    setClassesLoading(true)
    setClassesError("")
    try {
      const data = await api.getTeacherClasses(token)
      setMyClasses(data.classes || [])
    } catch (e) {
      setClassesError("Could not load your classes. Is the backend running?")
    }
    setClassesLoading(false)
  }

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

  // Clicking a class card → prefill code and switch to Class Results tab
  const selectClass = (code) => {
    setCodeInput(code)
    setResults(null)
    setActiveTab("Class Results")
  }

  const tabStyle = (tab) => ({
    padding     : "8px 20px",
    borderRadius: "20px",
    border      : "none",
    cursor      : "pointer",
    fontFamily  : "Arial",
    fontSize    : "13px",
    fontWeight  : activeTab === tab ? "bold" : "normal",
    background  : activeTab === tab ? "#1A5276" : "#F2F3F4",
    color       : activeTab === tab ? "white" : "#5D6D7E",
    transition  : "all 0.15s",
  })

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "20px",
      }}>
        <h1 className="heading-1">Teacher Dashboard</h1>
        <button className="btn-secondary" onClick={onBack}>← Student View</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab} style={tabStyle(tab)} onClick={() => setActiveTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── TAB: My Classes ─────────────────────────────────────── */}
      {activeTab === "My Classes" && (
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "16px",
          }}>
            <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#5D6D7E" }}>
              {myClasses.length} class{myClasses.length !== 1 ? "es" : ""} found
            </p>
            <button
              className="btn-secondary"
              onClick={loadMyClasses}
              disabled={classesLoading}
              style={{ padding: "6px 14px", fontSize: "13px" }}
            >
              {classesLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {classesError && (
            <p style={{ color: "#C0392B", fontFamily: "Arial", fontSize: "13px", marginBottom: "12px" }}>
              {classesError}
            </p>
          )}

          {classesLoading && !myClasses.length && (
            <div className="card">
              <p style={{ fontFamily: "Arial", color: "#95A5A6", textAlign: "center" }}>
                Loading your classes...
              </p>
            </div>
          )}

          {!classesLoading && !classesError && myClasses.length === 0 && (
            <div className="card">
              <p style={{ fontFamily: "Arial", color: "#95A5A6", fontSize: "14px" }}>
                No classes created yet. Create a unit and share it with students to get started.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {myClasses.map(cls => (
              <div
                key={cls.class_code}
                className="card"
                style={{ cursor: "pointer" }}
                onClick={() => selectClass(cls.class_code)}
              >
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start",
                }}>
                  {/* Left: unit details */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "flex", alignItems: "center",
                      gap: "10px", marginBottom: "4px",
                    }}>
                      <span style={{
                        fontFamily   : "Arial",
                        fontSize     : "18px",
                        fontWeight   : "bold",
                        color        : "#1A5276",
                        letterSpacing: "2px",
                      }}>
                        {cls.class_code}
                      </span>
                      <span style={{
                        background  : "#EBF5FB",
                        color       : "#1A5276",
                        borderRadius: "12px",
                        padding     : "2px 10px",
                        fontSize    : "11px",
                        fontFamily  : "Arial",
                        fontWeight  : "bold",
                      }}>
                        {cls.status || "active"}
                      </span>
                    </div>
                    <p style={{
                      fontFamily  : "Arial",
                      fontSize    : "13px",
                      color       : "#2C3E50",
                      marginBottom: "2px",
                    }}>
                      {cls.unit_input?.subject} — {cls.unit_input?.chapter}
                    </p>
                    <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#95A5A6" }}>
                      Grade {cls.unit_input?.grade}
                      {cls.created_at && ` · ${new Date(cls.created_at).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Right: stats */}
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                    <p style={{
                      fontSize: "28px", fontWeight: "bold",
                      color: "#1A5276", fontFamily: "Arial", margin: 0,
                    }}>
                      {cls.student_count ?? 0}
                    </p>
                    <p style={{ fontSize: "11px", color: "#95A5A6", fontFamily: "Arial", margin: 0 }}>
                      students
                    </p>
                    {cls.avg_exit_score != null && (
                      <>
                        <p style={{
                          fontSize   : "18px",
                          fontWeight : "bold",
                          color      : cls.avg_exit_score >= 70 ? "#1E8449"
                                     : cls.avg_exit_score >= 50 ? "#B7950B"
                                     : "#C0392B",
                          fontFamily : "Arial",
                          margin     : "4px 0 0",
                        }}>
                          {cls.avg_exit_score}%
                        </p>
                        <p style={{ fontSize: "11px", color: "#95A5A6", fontFamily: "Arial", margin: 0 }}>
                          avg exit score
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#3498DB", marginTop: "8px" }}>
                  Click to view results →
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Class Results ──────────────────────────────────── */}
      {activeTab === "Class Results" && (
        <div>
          {/* Code lookup */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <p style={{
              fontFamily: "Arial", fontWeight: "bold",
              fontSize: "13px", color: "#1A5276", marginBottom: "8px",
            }}>
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
                  fontSize: "15px", letterSpacing: "3px", fontWeight: "bold",
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

            {/* Quick-select chips from My Classes */}
            {myClasses.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#5D6D7E", marginBottom: "6px" }}>
                  Or pick from your classes:
                </p>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {myClasses.map(cls => (
                    <button
                      key={cls.class_code}
                      onClick={() => { setCodeInput(cls.class_code); setFetchError("") }}
                      style={{
                        padding    : "4px 12px",
                        borderRadius: "14px",
                        border     : codeInput === cls.class_code
                          ? "2px solid #1A5276"
                          : "1px solid #BDC3C7",
                        background : codeInput === cls.class_code ? "#EBF5FB" : "white",
                        color      : "#1A5276",
                        fontFamily : "Arial",
                        fontSize   : "12px",
                        fontWeight : "bold",
                        cursor     : "pointer",
                        letterSpacing: "1px",
                      }}
                    >
                      {cls.class_code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results panel */}
          {results && (
            <div className="card">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "16px",
              }}>
                <h2 className="heading-2">Class {results.class_code}</h2>
              </div>

              {/* 4 summary cards */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
                <SummaryCard label="Total Students" value={results.total_students}   color="#1A5276" />
                <SummaryCard label="Complete"       value={results.complete ?? 0}    color="#1E8449" />
                <SummaryCard label="In Progress"    value={results.in_progress ?? 0} color="#B7950B" />
                <SummaryCard label="Not Started"    value={results.not_started ?? 0} color="#C0392B" />
              </div>

              {/* Avg exit score */}
              {results.avg_exit_score != null && (
                <div style={{
                  background  : "#EBF5FB",
                  borderRadius: "8px",
                  padding     : "10px 14px",
                  marginBottom: "16px",
                  display     : "flex",
                  alignItems  : "center",
                  gap         : "10px",
                }}>
                  <span style={{
                    fontSize: "22px", fontWeight: "bold",
                    color: "#1A5276", fontFamily: "Arial",
                  }}>
                    {results.avg_exit_score}%
                  </span>
                  <span style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E" }}>
                    class average exit ticket score
                  </span>
                </div>
              )}

              {results.students.length === 0 ? (
                <p style={{ fontFamily: "Arial", color: "#95A5A6", fontSize: "14px" }}>
                  No students have joined this class yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{
                    width: "100%", borderCollapse: "collapse",
                    fontFamily: "Arial", fontSize: "13px",
                  }}>
                    <thead>
                      <tr style={{ background: "#1A5276" }}>
                        {["Student Name", "Templates Done", "Exit Ticket", "Mastery Gate", "Status"].map(h => (
                          <th key={h} style={{
                            padding: "10px 12px", textAlign: "left",
                            color: "white", fontWeight: "bold", fontSize: "12px",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.students.map((s, i) => {
                        const p         = s.progress || {}
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

      {/* ── TAB: Progress ───────────────────────────────────────── */}
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
                    ["Context", unitInput?.context],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p style={{
                        fontSize: "11px", color: "#5D6D7E",
                        fontFamily: "Arial", marginBottom: "2px",
                      }}>
                        {label}
                      </p>
                      <p style={{
                        fontSize: "14px", fontWeight: "bold",
                        fontFamily: "Arial", color: "#2C3E50",
                      }}>
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
                <p style={{
                  marginTop: "12px", fontSize: "12px",
                  color: "#95A5A6", fontFamily: "Arial",
                }}>
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
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "10px 14px",
                        borderRadius: "8px",
                        background: done ? "#D5F5E3" : "#F8F9FA",
                        border: `1px solid ${done ? "#1E8449" : "#E5E7E9"}`,
                      }}>
                        <span style={{
                          fontFamily: "Arial", fontSize: "14px",
                          color: done ? "#1E8449" : "#5D6D7E",
                        }}>
                          {t}
                        </span>
                        <span style={{
                          fontFamily: "Arial", fontSize: "13px", fontWeight: "bold",
                          color: done ? "#1E8449" : "#BDC3C7",
                        }}>
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
    </div>
  )
}
