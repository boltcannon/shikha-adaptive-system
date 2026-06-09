import React, { useEffect, useState } from "react"
import { Routes, Route, useParams } from "react-router-dom"
import { UnitProvider, useUnit } from "./context/UnitContext"
import AuthScreen from "./screens/AuthScreen"
import SimpleLoader from "./components/SimpleLoader"
import UnitProgress from "./components/UnitProgress"
import TeacherInput from "./screens/TeacherInput"
import UnitLoader from "./screens/UnitLoader"
import StudentJoin from "./screens/StudentJoin"
import Provocation from "./templates/Provocation"
import NCL from "./templates/NCL"
import NclReview from "./templates/NclReview"
import Analysis from "./templates/Analysis"
import AnalysisReview from "./templates/AnalysisReview"
import Discussion from "./templates/Discussion"
import MasteryGate from "./templates/MasteryGate"
import ProjectPlanning from "./templates/ProjectPlanning"
import RAC from "./templates/RAC"
import Reflection from "./templates/Reflection"
import TeacherDashboard from "./screens/TeacherDashboard"
import AssessmentBuilder from "./screens/AssessmentBuilder"
import DevPanel from "./components/DevPanel"
import "./App.css"

// Screens that show the unit progress stepper
const TEMPLATE_SCREENS = [
  "provocation", "ncl", "ncl_review",
  "analysis", "analysis_review",
  "discussion", "masteryGate",
  "projectPlanning", "rac", "reflection",
]

// Handles /join/:classCode URL — renders StudentJoin with the code from URL
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
    currentUser, authLoading, logout,
    resumeScreen,
  } = useUnit()

  const [screen, setScreen] = useState("auth")

  // Scroll to top on every screen transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [screen])

  // After auth verification — navigate returning users to their screen,
  // or send fresh logins (from AuthScreen) to teacherInput as fallback
  useEffect(() => {
    if (!authLoading && currentUser) {
      if (resumeScreen) {
        setScreen(resumeScreen)
      } else if (screen === "auth") {
        // Fresh login handled by AuthScreen's onNavigate, but guard against
        // landing stuck on auth if that path was skipped somehow
        setScreen("teacherInput")
      }
    }
  }, [authLoading, currentUser, resumeScreen]) // eslint-disable-line

  const navigateTo = (s) => setScreen(s)

  // Clear session and return to input — resets ALL state
  const handleNewUnit = () => {
    setSessionId(null)
    setUnitInput(null)
    setGeneratedContent(null)
    setPerformance({ exitTicketScore: null, masteryGateResult: null, projectIdea: "", completedTemplates: [] })
    clearStudentSession()
    setScreen("teacherInput")
  }

  const renderScreen = () => {
    if (authLoading) return <SimpleLoader />

    // Unauthenticated users always see auth (except the /join route, which bypasses renderScreen)
    if (!currentUser && screen !== "auth") {
      return <AuthScreen onNavigate={navigateTo} />
    }

    // Teacher-only screens — redirect non-teachers to teacherInput
    if (screen === "assessmentBuilder") {
      return currentUser?.role === "teacher"
        ? <AssessmentBuilder onBack={() => navigateTo("teacherDashboard")} />
        : <TeacherInput onNavigate={navigateTo} />
    }
    if (screen === "teacherDashboard") {
      return currentUser?.role === "teacher"
        ? <TeacherDashboard onBack={() => navigateTo("teacherInput")} />
        : <TeacherInput onNavigate={navigateTo} />
    }

    switch (screen) {
      case "auth":            return <AuthScreen onNavigate={navigateTo} />
      case "teacherInput":    return <TeacherInput onNavigate={navigateTo} />
      case "unitLoader":      return <UnitLoader onNavigate={navigateTo} />
      case "provocation":     return <Provocation onNavigate={navigateTo} />
      case "ncl":             return <NCL onNavigate={navigateTo} />
      case "ncl_review":      return <NclReview onNavigate={navigateTo} />
      case "analysis":        return <Analysis onNavigate={navigateTo} />
      case "analysis_review": return <AnalysisReview onNavigate={navigateTo} />
      case "discussion":      return <Discussion onNavigate={navigateTo} />
      case "masteryGate":     return <MasteryGate onNavigate={navigateTo} />
      case "projectPlanning": return <ProjectPlanning onNavigate={navigateTo} />
      case "rac":             return <RAC onNavigate={navigateTo} />
      case "reflection":      return <Reflection onNavigate={navigateTo} />
      default:                return <TeacherInput onNavigate={navigateTo} />
    }
  }

  const isTeacher = currentUser?.role === "teacher"

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
          <span style={{
            color: "#E87722", fontWeight: "bold",
            fontSize: "12px", fontFamily: "Arial", letterSpacing: "1px",
          }}>
            SHIKHA ACADEMY
          </span>
          <span style={{ color: "white", fontSize: "14px", fontFamily: "Arial", marginLeft: "12px" }}>
            Adaptive Learning Framework
          </span>
        </div>

        {/* Right-side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

          {/* Student name in guest mode */}
          {studentName && !currentUser && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontFamily: "Arial" }}>
              {studentName}
            </span>
          )}

          {/* Signed-in user name + sign out */}
          {currentUser && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontFamily: "Arial" }}>
                {currentUser.name}
              </span>
              <button
                onClick={() => { logout(); navigateTo("auth") }}
                style={{
                  background: "rgba(255,255,255,0.15)", color: "white",
                  border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                  padding: "4px 10px", cursor: "pointer",
                  fontFamily: "Arial", fontSize: "12px",
                }}
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Assessment Builder — teachers only */}
          {isTeacher && sessionId && (
            <button
              onClick={() => navigateTo("assessmentBuilder")}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                padding: "6px 14px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "13px",
              }}
            >
              📝 Assessment
            </button>
          )}

          {/* Teacher Dashboard — teachers only */}
          {isTeacher && sessionId && (
            <button
              onClick={() => navigateTo("teacherDashboard")}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                padding: "6px 14px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "13px",
              }}
            >
              📊 Dashboard
            </button>
          )}

          {/* New Unit — anyone with a session */}
          {sessionId && (
            <button
              onClick={handleNewUnit}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                padding: "6px 14px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "13px",
              }}
            >
              ← New Unit
            </button>
          )}
        </div>
      </div>

      {/* ── Unit progress stepper (template screens only) ─── */}
      {TEMPLATE_SCREENS.includes(screen) && (
        <UnitProgress currentScreen={screen} />
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <div className="app-container">
        <Routes>
          {/* Backward-compat class code URL — no auth required */}
          <Route
            path="/join/:classCode"
            element={<StudentJoinWrapper onNavigate={navigateTo} />}
          />
          <Route path="*" element={renderScreen()} />
        </Routes>
      </div>

      {/* ── Developer panel (dev only) ────────────────────── */}
      <DevPanel onNavigate={navigateTo} />
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
