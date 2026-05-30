import React from "react"
import { useUnit } from "../context/UnitContext"

// Maps the display name shown in the dashboard to the key stored in completedTemplates
const TEMPLATE_KEYS = {
  "Provocation":     "provocation",
  "NCL":             "ncl",
  "Analysis":        "analysis",
  "Discussion":      "discussion",
  "Mastery Gate":    "masteryGate",
  "Project Planning":"projectPlanning",
  "RAC":             "rac",
  "Reflection":      "reflection"
}

export default function TeacherDashboard({ onBack }) {
  const { unitInput, sessionId, performance } = useUnit()

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 className="heading-1">Teacher Dashboard</h1>
        <button className="btn-secondary" onClick={onBack}>← Student View</button>
      </div>

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
                ["Grade", unitInput?.grade],
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
              {Object.keys(TEMPLATE_KEYS).map(t => {
                const done = performance.completedTemplates.includes(TEMPLATE_KEYS[t])
                return (
                  <div key={t} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "8px",
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
    </div>
  )
}
