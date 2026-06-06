import React, { useEffect, useState } from "react"
import { Routes, Route, useParams, useMatch } from "react-router-dom"
import { UnitProvider, useUnit } from "./context/UnitContext"
import TeacherInput from "./screens/TeacherInput"
import UnitLoader from "./screens/UnitLoader"
import StudentJoin from "./screens/StudentJoin"
import TeacherSharePanel from "./screens/TeacherSharePanel"
import Provocation from "./templates/Provocation"
import NCL from "./templates/NCL"
import Analysis from "./templates/Analysis"
import Discussion from "./templates/Discussion"
import MasteryGate from "./templates/MasteryGate"
import ProjectPlanning from "./templates/ProjectPlanning"
import RAC from "./templates/RAC"
import Reflection from "./templates/Reflection"
import TeacherDashboard from "./screens/TeacherDashboard"
import DevPanel from "./components/DevPanel"
import "./App.css"

function StudentJoinWrapper({ onNavigate }) {
  const { classCode } = useParams()
  return (
    <StudentJoin
      onNavigate={onNavigate}
      initialCode={classCode?.toUpperCase() || ""}
    />
  )
}

// ── Inner app — inside UnitProvider so useUnit() works ──────────
function AppContent() {
  const {
    sessionId, setSessionId,
    setUnitInput, setGeneratedContent,
    setPerformance, clearStudentSession,
    studentName,
  } = useUnit()

  const [screen,        setScreen]        = useState("teacherInput")
  const [mode,          setMode]          = useState("student")
  const [showSharePanel, setShowSharePanel] = useState(false)

  // Scroll to top on every screen transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [screen])

  // Hide "Share with Class" on /join/:classCode URLs
  const isJoinRoute = useMatch("/join/:classCode")

  const navigateTo = (s) => {
    if (s === "teacherDashboard") { setMode("teacher"); return }
    setScreen(s)
  }

  // Clear session and return to Teacher Input — reset ALL state
  const handleNewUnit = () => {
    setSessionId(null)
    setUnitInput(null)
    setGeneratedContent(null)
    setPerformance({ exitTicketScore: null, masteryGateResult: null, projectIdea: "", completedTemplates: [] })
    clearStudentSession()
    setScreen("teacherInput")
    setMode("student")
  }

  const renderScreen = () => {
    if (mode === "teacher") {
      return <TeacherDashboard onBack={() => setMode("student")} />
    }
    switch (screen) {
      case "teacherInput":    return <TeacherInput onNavigate={navigateTo} />
      case "unitLoader":      return <UnitLoader onNavigate={navigateTo} />
      case "provocation":     return <Provocation onNavigate={navigateTo} />
      case "ncl":             return <NCL onNavigate={navigateTo} />
      case "analysis":        return <Analysis onNavigate={navigateTo} />
      case "discussion":      return <Discussion onNavigate={navigateTo} />
      case "masteryGate":     return <MasteryGate onNavigate={navigateTo} />
      case "projectPlanning": return <ProjectPlanning onNavigate={navigateTo} />
      case "rac":             return <RAC onNavigate={navigateTo} />
      case "reflection":      return <Reflection onNavigate={navigateTo} />
      case "studentJoin":     return <StudentJoin onNavigate={navigateTo} initialCode="" />
      default:                return <TeacherInput onNavigate={navigateTo} />
    }
  }

  return (
    <>
      {/* ── Top nav bar ───────────────────────────────────── */}
      <div style={{
        background: "#1A5276", padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        {/* Brand */}
        <div>
          <span style={{ color: "#E87722", fontWeight: "bold", fontSize: "12px", fontFamily: "Arial", letterSpacing: "1px" }}>
            SHIKHA ACADEMY
          </span>
          <span style={{ color: "white", fontSize: "14px", fontFamily: "Arial", marginLeft: "12px" }}>
            Adaptive Learning Framework
          </span>
        </div>

        {/* Right-side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

          {/* Fix 4 — student name while in student mode */}
          {mode === "student" && studentName && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontFamily: "Arial" }}>
              👤 {studentName}
            </span>
          )}

          {/* Fix 1 — New Unit (teacher mode + session exists) */}
          {sessionId && mode === "teacher" && (
            <button
              onClick={handleNewUnit}
              style={{
                background  : "rgba(255,255,255,0.15)",
                color       : "white",
                border      : "1px solid rgba(255,255,255,0.3)",
                borderRadius: "6px",
                padding     : "6px 14px",
                cursor      : "pointer",
                fontFamily  : "Arial",
                fontSize    : "13px",
              }}
            >
              ← New Unit
            </button>
          )}

          {/* Share with Class — hidden on student join route */}
          {mode === "student" && !isJoinRoute && (
            <button
              onClick={() => setShowSharePanel(true)}
              style={{
                background: "#E87722", color: "white", border: "none",
                borderRadius: "6px", padding: "6px 14px",
                cursor: "pointer", fontFamily: "Arial", fontSize: "13px",
              }}
            >
              Share with Class
            </button>
          )}

          {/* Teacher / Student view toggle */}
          <button
            onClick={() => setMode(mode === "student" ? "teacher" : "student")}
            style={{
              background: "rgba(255,255,255,0.15)", color: "white",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
              padding: "6px 14px", cursor: "pointer",
              fontFamily: "Arial", fontSize: "13px",
            }}
          >
            {mode === "student" ? "Teacher View" : "Student View"}
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="app-container">
        <Routes>
          <Route
            path="/join/:classCode"
            element={<StudentJoinWrapper onNavigate={navigateTo} />}
          />
          <Route path="*" element={renderScreen()} />
        </Routes>
      </div>

      {/* ── Teacher share panel overlay ───────────────────── */}
      {showSharePanel && (
        <TeacherSharePanel
          onClose={() => setShowSharePanel(false)}
          onStartStudentView={() => {
            setShowSharePanel(false)
            setMode("student")
            navigateTo("provocation")
          }}
        />
      )}

      {/* ── Developer panel (dev only) ────────────────────── */}
      <DevPanel onNavigate={navigateTo} onModeChange={setMode} />
    </>
  )
}

// ── Root: UnitProvider wraps AppContent so all hooks work ───────
export default function App() {
  return (
    <UnitProvider>
      <AppContent />
    </UnitProvider>
  )
}
