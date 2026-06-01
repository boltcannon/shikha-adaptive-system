import React, { useEffect, useState } from "react"
import { UnitProvider } from "./context/UnitContext"
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
import "./App.css"

export default function App() {
  const [screen, setScreen]             = useState("teacherInput")
  const [mode, setMode]                 = useState("student")
  const [initialCode, setInitialCode]   = useState("")
  const [showSharePanel, setShowSharePanel] = useState(false)

  // Detect /join/:classCode in the URL on first load
  useEffect(() => {
    const path = window.location.pathname
    if (path.startsWith("/join/")) {
      const code = path.split("/join/")[1]?.trim()
      if (code) {
        setInitialCode(code.toUpperCase())
        setScreen("studentJoin")
      }
    }
  }, [])

  const navigateTo = (s) => {
    if (s === "teacherDashboard") { setMode("teacher"); return }
    setScreen(s)
  }

  const renderScreen = () => {
    if (mode === "teacher") {
      return <TeacherDashboard onBack={() => setMode("student")} />
    }
    switch (screen) {
      case "studentJoin":    return <StudentJoin onNavigate={navigateTo} initialCode={initialCode} />
      case "teacherInput":   return <TeacherInput onNavigate={navigateTo} />
      case "unitLoader":     return <UnitLoader onNavigate={navigateTo} />
      case "provocation":    return <Provocation onNavigate={navigateTo} />
      case "ncl":            return <NCL onNavigate={navigateTo} />
      case "analysis":       return <Analysis onNavigate={navigateTo} />
      case "discussion":     return <Discussion onNavigate={navigateTo} />
      case "masteryGate":    return <MasteryGate onNavigate={navigateTo} />
      case "projectPlanning":return <ProjectPlanning onNavigate={navigateTo} />
      case "rac":            return <RAC onNavigate={navigateTo} />
      case "reflection":     return <Reflection onNavigate={navigateTo} />
      default:               return <TeacherInput onNavigate={navigateTo} />
    }
  }

  return (
    <UnitProvider>
      {/* Top nav bar */}
      <div style={{
        background: "#1A5276", padding: "12px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div>
          <span style={{ color: "#E87722", fontWeight: "bold", fontSize: "12px", fontFamily: "Arial", letterSpacing: "1px" }}>
            SHIKHA ACADEMY
          </span>
          <span style={{ color: "white", fontSize: "14px", fontFamily: "Arial", marginLeft: "12px" }}>
            Adaptive Learning Framework
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Share with Class button — only in student mode so teacher can see it */}
          {mode === "student" && screen !== "studentJoin" && (
            <button
              onClick={() => setShowSharePanel(true)}
              style={{
                background: "#E87722", color: "white", border: "none",
                borderRadius: "6px", padding: "6px 14px",
                cursor: "pointer", fontFamily: "Arial", fontSize: "13px"
              }}
            >
              Share with Class
            </button>
          )}

          <button
            onClick={() => setMode(mode === "student" ? "teacher" : "student")}
            style={{
              background: "rgba(255,255,255,0.15)", color: "white",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
              padding: "6px 14px", cursor: "pointer",
              fontFamily: "Arial", fontSize: "13px"
            }}
          >
            {mode === "student" ? "Teacher View" : "Student View"}
          </button>
        </div>
      </div>

      <div className="app-container">
        {renderScreen()}
      </div>

      {/* Teacher share panel overlay */}
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
    </UnitProvider>
  )
}
