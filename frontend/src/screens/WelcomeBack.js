import React from "react"
import { useUnit } from "../context/UnitContext"

const TEMPLATE_LABELS = {
  provocation  : "Provocation",
  ncl          : "New Content Learning",
  ncl_review   : "NCL Review",
  analysis     : "Analysis",
  discussion   : "Explore Perspectives",
  masteryGate  : "Mastery Gate",
  rac          : "Research & Creation",
  reflection   : "Reflection",
  finalSummary : "Final Summary",
}

const TEMPLATE_DESCRIPTIONS = {
  provocation  : "Exploring real-world scenarios",
  ncl          : "Learning new concepts",
  ncl_review   : "Reviewing concepts you found tricky",
  analysis     : "Analysing data and finding patterns",
  discussion   : "Exploring different perspectives",
  masteryGate  : "Testing your understanding",
  rac          : "Building your research project",
  reflection   : "Reflecting on your learning",
  finalSummary : "Viewing your final results",
}

const TEMPLATE_ICONS = {
  provocation  : "🔍",
  ncl          : "📖",
  ncl_review   : "🔄",
  analysis     : "📊",
  discussion   : "💭",
  masteryGate  : "🎯",
  rac          : "🔬",
  reflection   : "✨",
  finalSummary : "🎓",
}

export default function WelcomeBack({ onNavigate }) {
  const { currentUser, studentProgress, unitInput } = useUnit()

  const currentScreen  = studentProgress?.current_screen
  const completed      = studentProgress?.completed_templates || []
  const exitScore      = studentProgress?.exit_ticket_score
  const chapter        = unitInput?.chapter || studentProgress?.chapter

  const templateLabel = TEMPLATE_LABELS[currentScreen]  || currentScreen
  const templateDesc  = TEMPLATE_DESCRIPTIONS[currentScreen] || ""
  const templateIcon  = TEMPLATE_ICONS[currentScreen]   || "📚"

  const completedCount = completed.length
  const totalTemplates = 7

  return (
    <div style={{ maxWidth: "440px", margin: "0 auto", padding: "40px 16px 0" }}>
      {/* Welcome message */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{ fontSize: "48px", marginBottom: "12px" }}>👋</p>
        <h1 style={{
          fontSize: "26px", fontWeight: "bold",
          color: "#1A5276", fontFamily: "Arial", marginBottom: "6px",
        }}>
          Welcome back, {currentUser?.name?.split(" ")[0]}!
        </h1>
        <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial" }}>
          You were in the middle of a learning unit
        </p>
      </div>

      {/* Current unit card */}
      {chapter && (
        <div style={{
          background: "#1A5276", borderRadius: "12px",
          padding: "20px", marginBottom: "16px",
        }}>
          <p style={{
            color: "rgba(255,255,255,0.6)", fontSize: "11px",
            fontFamily: "Arial", marginBottom: "4px",
            textTransform: "uppercase", letterSpacing: "0.5px",
          }}>
            Current Unit
          </p>
          <p style={{
            color: "white", fontSize: "18px",
            fontWeight: "bold", fontFamily: "Arial", marginBottom: "4px",
          }}>
            {chapter}
          </p>
          {unitInput?.grade && (
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", fontFamily: "Arial" }}>
              {unitInput.grade} · {unitInput.subject}
            </p>
          )}
        </div>
      )}

      {/* Where you left off */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{
          fontSize: "11px", fontWeight: "bold", color: "#5D6D7E",
          fontFamily: "Arial", marginBottom: "12px",
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          Where You Left Off
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <span style={{ fontSize: "32px" }}>{templateIcon}</span>
          <div>
            <p style={{
              fontWeight: "bold", fontSize: "16px",
              color: "#1A5276", fontFamily: "Arial", marginBottom: "2px",
            }}>
              {templateLabel}
            </p>
            <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
              {templateDesc}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial" }}>
              Progress
            </span>
            <span style={{
              fontSize: "11px", color: "#1A5276",
              fontFamily: "Arial", fontWeight: "bold",
            }}>
              {completedCount}/{totalTemplates} templates done
            </span>
          </div>
          <div style={{ background: "#F2F3F4", borderRadius: "4px", height: "8px" }}>
            <div style={{
              background: "#E87722", borderRadius: "4px", height: "8px",
              width: `${Math.round((completedCount / totalTemplates) * 100)}%`,
              transition: "width 0.3s",
            }} />
          </div>
        </div>

        {exitScore != null && (
          <p style={{
            fontSize: "12px", fontFamily: "Arial",
            color: exitScore >= 4 ? "#1E8449" : exitScore >= 2 ? "#B7950B" : "#C0392B",
          }}>
            Exit ticket: {exitScore}/5
          </p>
        )}
      </div>

      {/* Completed templates */}
      {completed.length > 0 && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <p style={{
            fontSize: "11px", fontWeight: "bold", color: "#5D6D7E",
            fontFamily: "Arial", marginBottom: "10px", textTransform: "uppercase",
          }}>
            Completed
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {completed.map(t => (
              <span key={t} style={{
                background: "#D5F5E3", color: "#1E8449",
                padding: "4px 10px", borderRadius: "10px",
                fontSize: "12px", fontFamily: "Arial", fontWeight: "bold",
              }}>
                ✓ {TEMPLATE_LABELS[t] || t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
        <button
          className="btn-primary"
          onClick={() => onNavigate(currentScreen || "teacherInput")}
          style={{ flex: 2, padding: "14px", fontSize: "15px" }}
        >
          Continue Learning →
        </button>
        <button
          onClick={() => onNavigate("teacherInput")}
          style={{
            flex: 1, padding: "14px", fontSize: "13px",
            background: "white", border: "2px solid #1A5276",
            borderRadius: "8px", color: "#1A5276",
            cursor: "pointer", fontFamily: "Arial", fontWeight: "bold",
          }}
        >
          New Unit
        </button>
      </div>

      <button
        onClick={() => onNavigate("myLearning")}
        style={{
          width: "100%", padding: "10px",
          background: "none", border: "none",
          color: "#5D6D7E", cursor: "pointer",
          fontFamily: "Arial", fontSize: "13px", textAlign: "center",
        }}
      >
        View my learning history →
      </button>
    </div>
  )
}
