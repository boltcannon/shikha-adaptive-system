import React, { useEffect, useState } from "react"
import { UnitProvider, useUnit } from "./context/UnitContext"
import AuthScreen from "./screens/AuthScreen"
import SimpleLoader from "./components/SimpleLoader"
import UnitProgress from "./components/UnitProgress"
import TeacherInput from "./screens/TeacherInput"
import UnitLoader from "./screens/UnitLoader"
import Provocation from "./templates/Provocation"
import NCL from "./templates/NCL"
import NclReview from "./screens/NclReview"
import FinalSummary from "./screens/FinalSummary"
import MyLearning from "./screens/MyLearning"
import WelcomeBack from "./screens/WelcomeBack"
import Analysis from "./templates/Analysis"
import AnalysisReview from "./templates/AnalysisReview"
import Discussion from "./templates/Discussion"
import MasteryGate from "./templates/MasteryGate"
import RAC from "./templates/RAC"
import Reflection from "./templates/Reflection"
import DevPanel from "./components/DevPanel"
import "./App.css"

const TEMPLATE_SCREENS = [
  "provocation", "ncl", "ncl_review",
  "analysis", "analysis_review",
  "discussion", "masteryGate",
  "rac", "reflection",
]

function AppContent() {
  const {
    sessionId, setSessionId,
    setUnitInput, setGeneratedContent,
    setStudentProgress, setNclProgress,
    currentUser, authLoading, logout,
    resumeScreen,
  } = useUnit()

  const [screen, setScreen] = useState("auth")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [screen])

  // Keep Render awake
  useEffect(() => {
    const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
    const wakeUp = () => fetch(`${BASE_URL}/ping`).catch(() => {})
    wakeUp()
    const interval = setInterval(wakeUp, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (resumeScreen) {
        setScreen(resumeScreen)
      } else if (screen === "auth") {
        setScreen("teacherInput")
      }
    }
  }, [authLoading, currentUser, resumeScreen]) // eslint-disable-line

  const navigateTo = (s) => setScreen(s)

  const handleNewUnit = () => {
    setSessionId(null)
    setUnitInput(null)
    setGeneratedContent(null)
    setNclProgress({ completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" })
    setStudentProgress({
      current_screen      : "provocation",
      completed_templates : [],
      exit_ticket_score   : null,
      mastery_gate_result : null,
      project_idea        : "",
      reflection_done     : false,
    })
    localStorage.removeItem("sessionId")
    localStorage.removeItem("studentId")
    localStorage.removeItem("studentProgress")
    localStorage.removeItem("nclProgress")
    setScreen("teacherInput")
  }

  const renderScreen = () => {
    if (authLoading) return <SimpleLoader />
    if (!currentUser && screen !== "auth") {
      return <AuthScreen onNavigate={navigateTo} />
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
      case "projectPlanning": return <RAC onNavigate={navigateTo} />
      case "rac":             return <RAC onNavigate={navigateTo} />
      case "reflection":      return <Reflection onNavigate={navigateTo} />
      case "finalSummary":    return <FinalSummary onNavigate={navigateTo} />
      case "myLearning":      return <MyLearning onNavigate={navigateTo} />
      case "welcomeBack":     return <WelcomeBack onNavigate={navigateTo} />
      default:                return <TeacherInput onNavigate={navigateTo} />
    }
  }

  return (
    <>
      {/* ── Nav bar ───────────────────────────────────────── */}
      <div style={{
        background: "#1A5276", padding: "10px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}>
        <span style={{
          color: "#E87722", fontWeight: "bold",
          fontSize: "15px", fontFamily: "Arial", letterSpacing: "1px",
        }}>
          SHIKHA <span style={{ color: "white", fontWeight: "normal" }}>Academy</span>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {currentUser && window.innerWidth > 480 && (
            <span style={{
              color: "rgba(255,255,255,0.8)", fontSize: "13px", fontFamily: "Arial",
              maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {currentUser.name}
            </span>
          )}

          {currentUser && (
            <button
              onClick={() => navigateTo("myLearning")}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                padding: "6px 10px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "12px",
                minHeight: "34px", touchAction: "manipulation",
              }}
            >
              {window.innerWidth > 480 ? "My Progress" : "📚"}
            </button>
          )}

          {sessionId && (
            <button
              onClick={handleNewUnit}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                padding: "6px 10px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "12px",
                minHeight: "34px", touchAction: "manipulation",
              }}
            >
              {window.innerWidth > 480 ? "← New Unit" : "+ New"}
            </button>
          )}

          {currentUser && (
            <button
              onClick={() => { logout(); setScreen("auth") }}
              style={{
                background: "rgba(255,255,255,0.15)", color: "white",
                border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                padding: "6px 10px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "12px",
                minHeight: "34px", touchAction: "manipulation",
              }}
            >
              {window.innerWidth > 480 ? "Sign Out" : "Out"}
            </button>
          )}
        </div>
      </div>

      {/* ── Unit progress stepper ─────────────────────────── */}
      {TEMPLATE_SCREENS.includes(screen) && (
        <UnitProgress currentScreen={screen} />
      )}

      {/* ── Main content ──────────────────────────────────── */}
      <div className="app-container">
        {renderScreen()}
      </div>

      <DevPanel onNavigate={navigateTo} />
    </>
  )
}

export default function App() {
  return (
    <UnitProvider>
      <AppContent />
    </UnitProvider>
  )
}
