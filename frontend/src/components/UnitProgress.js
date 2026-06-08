import React from "react"
import { useUnit } from "../context/UnitContext"

const STEPS = [
  { key: "provocation",     label: "Provocation"  },
  { key: "ncl",             label: "NCL"          },
  { key: "analysis",        label: "Analysis"     },
  { key: "discussion",      label: "Discussion"   },
  { key: "masteryGate",     label: "Mastery Gate" },
  { key: "projectPlanning", label: "Project"      },
  { key: "rac",             label: "Research"     },
  { key: "reflection",      label: "Reflection"   },
]

// Review screens map to their parent step for highlight purposes
const SCREEN_TO_STEP = {
  ncl_review      : "ncl",
  analysis_review : "analysis",
}

export default function UnitProgress({ currentScreen }) {
  const { performance } = useUnit()
  const completed = performance?.completedTemplates || []

  // Resolve review screens to their base step key
  const activeStep = SCREEN_TO_STEP[currentScreen] || currentScreen

  return (
    <div style={{
      background   : "white",
      borderBottom : "1px solid #E5E7E9",
      padding      : "10px 24px",
    }}>
      <div style={{
        display      : "flex",
        alignItems   : "center",
        overflowX    : "auto",
        paddingBottom: "2px",
      }}>
        {STEPS.map((step, i) => {
          const isDone    = completed.includes(step.key)
          const isCurrent = step.key === activeStep

          const ringColor = isDone ? "#1E8449" : isCurrent ? "#E87722" : "#BDC3C7"
          const fillColor = isDone ? "#1E8449" : isCurrent ? "#E87722" : "#F2F3F4"
          const txtColor  = isDone ? "#1E8449" : isCurrent ? "#E87722" : "#BDC3C7"
          const lineColor = isDone ? "#1E8449" : "#E5E7E9"

          return (
            <React.Fragment key={step.key}>
              {/* Step node */}
              <div style={{
                display       : "flex",
                flexDirection : "column",
                alignItems    : "center",
                flexShrink    : 0,
                minWidth      : "52px",
              }}>
                <div style={{
                  width          : "26px",
                  height         : "26px",
                  borderRadius   : "50%",
                  background     : fillColor,
                  border         : `2px solid ${ringColor}`,
                  display        : "flex",
                  alignItems     : "center",
                  justifyContent : "center",
                  color          : (isDone || isCurrent) ? "white" : "#BDC3C7",
                  fontSize       : "11px",
                  fontWeight     : "bold",
                  fontFamily     : "Arial",
                }}>
                  {isDone ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize   : "9px",
                  fontFamily : "Arial",
                  color      : txtColor,
                  marginTop  : "3px",
                  fontWeight : isCurrent ? "bold" : "normal",
                  whiteSpace : "nowrap",
                }}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex        : 1,
                  height      : "2px",
                  background  : lineColor,
                  minWidth    : "8px",
                  marginBottom: "14px",
                  flexShrink  : 1,
                }} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
