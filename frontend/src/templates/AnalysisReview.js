import React from "react"
import { useUnit } from "../context/UnitContext"

export default function AnalysisReview({ onNavigate }) {
  const { saveStudentProgress, studentProgress } = useUnit()

  const masteryResult = studentProgress?.mastery_gate_result || ""
  const weakSubtopics = studentProgress?.mastery_weak_subtopics || []

  return (
    <div>
      <div style={{
        background   : "#FEF9E7",
        border       : "2px solid #B7950B",
        borderRadius : "12px",
        padding      : "24px",
        marginBottom : "20px",
        textAlign    : "center",
      }}>
        <p style={{ fontSize: "40px", marginBottom: "12px" }}>🎯</p>
        <h2 style={{
          fontSize    : "20px",
          fontWeight  : "bold",
          color       : "#B7950B",
          fontFamily  : "Arial",
          marginBottom: "8px",
        }}>
          Let's Strengthen Your Understanding
        </h2>
        <p style={{
          fontSize  : "14px",
          color     : "#2C3E50",
          fontFamily: "Arial",
          lineHeight: "1.6",
        }}>
          Your mastery gate result: {masteryResult}
        </p>
      </div>

      {weakSubtopics.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{
            fontWeight  : "bold",
            fontSize    : "13px",
            color       : "#1A5276",
            fontFamily  : "Arial",
            marginBottom: "10px",
          }}>
            Topics to review:
          </p>
          {weakSubtopics.map(st => (
            <div key={st} style={{
              display     : "flex",
              alignItems  : "center",
              gap         : "8px",
              marginBottom: "6px",
            }}>
              <span style={{ color: "#E87722" }}>→</span>
              <span style={{ fontSize: "14px", color: "#2C3E50", fontFamily: "Arial" }}>
                {st.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: "24px" }}>
        <p style={{
          fontSize  : "14px",
          color     : "#5D6D7E",
          fontFamily: "Arial",
          lineHeight: "1.6",
        }}>
          Going through the Analysis again with a fresh perspective will help strengthen
          your understanding before starting your project. You can do this!
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => {
            saveStudentProgress({ current_screen: "analysis" })
            onNavigate("analysis")
          }}
          className="btn-primary"
          style={{ flex: 1, padding: "14px" }}
        >
          Practice Analysis Again →
        </button>
        <button
          onClick={() => {
            saveStudentProgress({ current_screen: "rac" })
            onNavigate("rac")
          }}
          className="btn-secondary"
          style={{ flex: 1, padding: "14px" }}
        >
          Continue to Project
        </button>
      </div>
    </div>
  )
}
