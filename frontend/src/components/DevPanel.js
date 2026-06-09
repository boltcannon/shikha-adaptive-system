import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

const SCREENS = [
  { key: "teacherInput",     label: "Teacher Input",       phase: "setup"      },
  { key: "unitLoader",       label: "Unit Loader",          phase: "setup"      },
  { key: "provocation",      label: "Provocation",          phase: "motivation" },
  { key: "ncl",              label: "New Content Learning", phase: "abilities"  },
  { key: "analysis",         label: "Analysis",             phase: "abilities"  },
  { key: "discussion",       label: "Discussion",           phase: "abilities"  },
  { key: "masteryGate",      label: "Mastery Gate",         phase: "checkpoint" },
  { key: "projectPlanning",  label: "Project Planning",     phase: "transfer"   },
  { key: "rac",              label: "Research & Creation",  phase: "transfer"   },
  { key: "reflection",       label: "Reflection",           phase: "transfer"   },
  { key: "teacherDashboard",  label: "Teacher Dashboard",    phase: "teacher"    },
  { key: "assessmentBuilder", label: "Assessment Builder",   phase: "teacher"    },
]

const PHASE_COLORS = {
  setup      : { bg: "#F2F3F4", text: "#5D6D7E" },
  motivation : { bg: "#FEF9E7", text: "#B7950B" },
  abilities  : { bg: "#D6EAF8", text: "#1A5276" },
  checkpoint : { bg: "#FADBD8", text: "#C0392B" },
  transfer   : { bg: "#D5F5E3", text: "#1E8449" },
  teacher    : { bg: "#E8DAEF", text: "#6C3483" },
}

const DEFAULT_UNIT = {
  grade  : "Class 6",
  subject: "Mathematics",
  chapter: "Integers",
  context: "Cricket",
}

const SCREENS_BY_PHASE = SCREENS.reduce((acc, s) => {
  if (!acc[s.phase]) acc[s.phase] = []
  acc[s.phase].push(s)
  return acc
}, {})

const QUICK_ACTIONS = [
  { screen: "masteryGate", label: "Setup + Mastery Gate", phase: "checkpoint" },
  { screen: "discussion",  label: "Setup + Discussion",    phase: "abilities"  },
  { screen: "reflection",  label: "Setup + Reflection",    phase: "transfer"   },
]

// ── Outer shell: checks env so the inner component's hooks
//    are never called conditionally (Rules of Hooks compliance)
export default function DevPanel(props) {
  if (process.env.NODE_ENV !== "development") return null
  return <DevPanelInner {...props} />
}

// ── Inner component: all hooks live here ─────────────────
function DevPanelInner({ onNavigate }) {
  const [open,       setOpen]       = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [status,     setStatus]     = useState("")
  const [customUnit, setCustomUnit] = useState(DEFAULT_UNIT)

  const {
    setSessionId, setUnitInput, setGeneratedContent,
    setStudentId, setStudentName,
    clearStudentSession,
  } = useUnit()

  // ── Create session + generate all content ─────────────
  const setupSession = async () => {
    setLoading(true)
    setStatus("Creating session...")
    try {
      clearStudentSession()

      const r1 = await api.createUnit(customUnit)
      setSessionId(r1.session_id)
      setUnitInput(customUnit)

      setStatus("Generating content (30-60 s)...")
      const r2 = await api.generateAll(r1.session_id)
      if (r2.content) setGeneratedContent(r2.content)
      setStatus(`Ready! (${r2.source ?? "done"})`)

      setStudentId("dev-student-001")
      setStudentName("Dev Student")
    } catch (e) {
      setStatus(`Error: ${e.message}`)
    }
    setLoading(false)
  }

  // ── Navigate to a screen ──────────────────────────────
  const jumpTo = (screen) => {
    onNavigate(screen)
    setOpen(false)
  }

  // ── Setup session then navigate ───────────────────────
  const quickSetup = async (screen) => {
    await setupSession()
    jumpTo(screen)
  }

  // ── Style helpers ─────────────────────────────────────
  const phaseBtn = (phase, extra = {}) => ({
    display     : "block",
    width       : "100%",
    padding     : "6px 10px",
    background  : PHASE_COLORS[phase].bg,
    color       : PHASE_COLORS[phase].text,
    border      : "none",
    borderRadius: "6px",
    cursor      : "pointer",
    fontFamily  : "Arial",
    fontSize    : "12px",
    textAlign   : "left",
    marginBottom: "3px",
    ...extra,
  })

  const sectionLabel = (color) => ({
    fontSize     : "10px",
    fontWeight   : "bold",
    color,
    fontFamily   : "Arial",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom : "6px",
    marginTop    : "0",
  })

  return (
    <>
      {/* Toggle button — fixed bottom-right */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Developer Panel (dev only)"
        style={{
          position    : "fixed",
          bottom      : "20px",
          right       : "20px",
          background  : open ? "#1A5276" : "#2C3E50",
          color       : "white",
          border      : "none",
          borderRadius: "50%",
          width       : "48px",
          height      : "48px",
          fontSize    : "20px",
          lineHeight  : "1",
          cursor      : "pointer",
          zIndex      : 9999,
          boxShadow   : "0 4px 12px rgba(0,0,0,0.35)",
          transition  : "background 0.2s",
        }}
      >
        🛠
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position    : "fixed",
          bottom      : "78px",
          right       : "20px",
          background  : "white",
          border      : "1px solid #BDC3C7",
          borderRadius: "12px",
          padding     : "16px",
          width       : "300px",
          maxHeight   : "80vh",
          overflowY   : "auto",
          zIndex      : 9999,
          boxShadow   : "0 8px 32px rgba(0,0,0,0.2)",
        }}>

          {/* Header */}
          <div style={{
            display       : "flex",
            justifyContent: "space-between",
            alignItems    : "center",
            marginBottom  : "14px",
            paddingBottom : "10px",
            borderBottom  : "1px solid #F2F3F4",
          }}>
            <span style={{ fontWeight: "bold", fontSize: "14px", color: "#1A5276", fontFamily: "Arial" }}>
              🛠 Developer Panel
            </span>
            <span style={{
              fontSize: "10px", fontWeight: "bold", fontFamily: "Arial",
              color: "#E87722", background: "#FEF9E7",
              padding: "2px 8px", borderRadius: "10px",
            }}>
              DEV ONLY
            </span>
          </div>

          {/* Unit config */}
          <p style={sectionLabel("#5D6D7E")}>Test Unit</p>
          {["grade", "subject", "chapter", "context"].map(field => (
            <input
              key={field}
              type="text"
              value={customUnit[field]}
              placeholder={field}
              onChange={e => setCustomUnit(u => ({ ...u, [field]: e.target.value }))}
              style={{
                width       : "100%",
                padding     : "5px 8px",
                border      : "1px solid #BDC3C7",
                borderRadius: "6px",
                fontFamily  : "Arial",
                fontSize    : "12px",
                marginBottom: "4px",
                boxSizing   : "border-box",
              }}
            />
          ))}

          {/* Setup button + status */}
          <button
            onClick={setupSession}
            disabled={loading}
            style={{
              width       : "100%",
              padding     : "8px",
              background  : loading ? "#BDC3C7" : "#1A5276",
              color       : "white",
              border      : "none",
              borderRadius: "6px",
              cursor      : loading ? "not-allowed" : "pointer",
              fontFamily  : "Arial",
              fontSize    : "13px",
              fontWeight  : "bold",
              margin      : "6px 0",
            }}
          >
            {loading ? "Setting up..." : "Setup Session"}
          </button>

          {status && (
            <p style={{
              fontSize    : "11px",
              color       : status.startsWith("Error") ? "#C0392B" : "#1E8449",
              fontFamily  : "Arial",
              marginBottom: "10px",
              textAlign   : "center",
            }}>
              {status}
            </p>
          )}

          {/* Screen navigation */}
          <div style={{ borderTop: "1px solid #F2F3F4", paddingTop: "12px" }}>
            <p style={sectionLabel("#5D6D7E")}>Jump to Screen</p>
            {Object.entries(SCREENS_BY_PHASE).map(([phase, screens]) => (
              <div key={phase} style={{ marginBottom: "10px" }}>
                <p style={sectionLabel(PHASE_COLORS[phase].text)}>{phase}</p>
                {screens.map(s => (
                  <button
                    key={s.key}
                    onClick={() => jumpTo(s.key)}
                    style={phaseBtn(phase)}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.72")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ borderTop: "1px solid #F2F3F4", paddingTop: "12px" }}>
            <p style={sectionLabel("#5D6D7E")}>Quick Actions</p>
            {QUICK_ACTIONS.map(({ screen, label, phase }) => (
              <button
                key={screen}
                onClick={() => quickSetup(screen)}
                disabled={loading}
                style={phaseBtn(phase, {
                  fontWeight  : "bold",
                  opacity     : loading ? 0.5 : 1,
                  cursor      : loading ? "not-allowed" : "pointer",
                  marginBottom: "4px",
                })}
              >
                {label}
              </button>
            ))}
          </div>

        </div>
      )}
    </>
  )
}
