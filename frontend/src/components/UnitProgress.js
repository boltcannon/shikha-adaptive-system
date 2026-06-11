import React from "react"
import { useUnit } from "../context/UnitContext"

const TEMPLATES = [
  { key: "provocation",     label: "Provocation",  short: "Prov" },
  { key: "ncl",             label: "NCL",          short: "NCL"  },
  { key: "analysis",        label: "Analysis",     short: "Anal" },
  { key: "discussion",      label: "Discussion",   short: "Disc" },
  { key: "masteryGate",     label: "Mastery Gate", short: "Gate" },
  { key: "projectPlanning", label: "Planning",     short: "Plan" },
  { key: "rac",             label: "Research",     short: "RAC"  },
  { key: "reflection",      label: "Reflection",   short: "Refl" },
]

export default function UnitProgress({ currentScreen }) {
  const { studentProgress } = useUnit()

  // Read from studentProgress which is persisted
  // to MongoDB and restored on every login
  const completed = studentProgress?.completed_templates
                    || []

  const unitScreens = TEMPLATES.map(t => t.key)
  if (!unitScreens.includes(currentScreen) &&
      currentScreen !== "ncl_review" &&
      currentScreen !== "analysis_review") {
    return null
  }

  const currentIndex = TEMPLATES.findIndex(t => {
    if (currentScreen === "ncl_review")
      return t.key === "ncl"
    if (currentScreen === "analysis_review")
      return t.key === "analysis"
    return t.key === currentScreen
  })

  return (
    <div style={{
      background   : "white",
      borderBottom : "1px solid #F2F3F4",
      padding      : "10px 24px",
      marginBottom : "0"
    }}>
      {/* Progress bar */}
      <div style={{
        display    : "flex",
        alignItems : "center",
        gap        : "0",
        marginBottom: "6px"
      }}>
        {TEMPLATES.map((template, index) => {
          const isDone    = completed.includes(template.key)
          const isCurrent = index === currentIndex

          return (
            <React.Fragment key={template.key}>
              <div style={{
                width          : "28px",
                height         : "28px",
                borderRadius   : "50%",
                background     : isDone ? "#1E8449"
                  : isCurrent ? "#E87722"
                  : "#F2F3F4",
                border         : `2px solid ${
                  isDone ? "#1E8449"
                  : isCurrent ? "#E87722"
                  : "#BDC3C7"
                }`,
                display        : "flex",
                alignItems     : "center",
                justifyContent : "center",
                fontSize       : "10px",
                fontWeight     : "bold",
                color          : isDone || isCurrent
                  ? "white" : "#BDC3C7",
                fontFamily     : "Arial",
                flexShrink     : 0,
                position       : "relative",
                zIndex         : 1,
                transition     : "all 0.3s"
              }}>
                {isDone ? "✓" : index + 1}
              </div>

              {index < TEMPLATES.length - 1 && (
                <div style={{
                  flex      : 1,
                  height    : "2px",
                  background: isDone ? "#1E8449" : "#F2F3F4",
                  minWidth  : "8px",
                  transition: "background 0.3s"
                }} />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Labels */}
      <div style={{ display: "flex", gap: "0" }}>
        {TEMPLATES.map((template, index) => {
          const isDone    = completed.includes(template.key)
          const isCurrent = index === currentIndex

          return (
            <React.Fragment key={template.key}>
              <div style={{
                width    : "28px",
                textAlign: "center",
                fontSize : "9px",
                color    : isDone ? "#1E8449"
                  : isCurrent ? "#E87722"
                  : "#BDC3C7",
                fontFamily: "Arial",
                fontWeight: isCurrent ? "bold" : "normal",
                flexShrink: 0,
                overflow  : "hidden"
              }}>
                {template.short}
              </div>
              {index < TEMPLATES.length - 1 && (
                <div style={{ flex: 1, minWidth: "8px" }} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
