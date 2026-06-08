import React from "react"
import { useUnit } from "../context/UnitContext"
import TemplateHeader from "../components/TemplateHeader"

export default function AnalysisReview({ onNavigate }) {
  const { generatedContent, performance } = useUnit()

  const analysisData = generatedContent?.analysis
  const result = performance?.masteryGateResult || "—"

  return (
    <div>
      <TemplateHeader template="MASTERY REVIEW" subtitle="Revisit the Concepts" />

      {/* Score callout */}
      <div style={{
        background   : "#FADBD8",
        border       : "2px solid #C0392B",
        borderRadius : "12px",
        padding      : "16px",
        marginBottom : "20px",
        textAlign    : "center",
      }}>
        <p style={{
          fontSize    : "28px",
          fontWeight  : "bold",
          color       : "#C0392B",
          fontFamily  : "Arial",
          marginBottom: "6px",
        }}>
          Mastery Gate: {result}
        </p>
        <p style={{ fontSize: "14px", color: "#922B21", fontFamily: "Arial" }}>
          The mastery gate shows some gaps. Let's revisit the key concepts before your project.
        </p>
      </div>

      {/* Analysis content review */}
      {analysisData ? (
        <div className="card" style={{ marginBottom: "12px" }}>
          <p style={{
            fontSize      : "12px",
            fontWeight    : "bold",
            color         : "#1A5276",
            fontFamily    : "Arial",
            marginBottom  : "8px",
            textTransform : "uppercase",
            letterSpacing : "0.5px",
          }}>
            Class Model — What We Discovered
          </p>
          <p style={{
            fontSize   : "14px",
            color      : "#2C3E50",
            fontFamily : "Arial",
            lineHeight : "1.7",
            marginBottom: "12px",
          }}>
            {analysisData.class_model}
          </p>

          {analysisData.reflection_prompts && analysisData.reflection_prompts.length > 0 && (
            <div>
              <p style={{
                fontSize     : "12px",
                fontWeight   : "bold",
                color        : "#E87722",
                fontFamily   : "Arial",
                marginBottom : "6px",
              }}>
                Think about:
              </p>
              {analysisData.reflection_prompts.slice(0, 2).map((prompt, i) => (
                <p key={i} style={{
                  fontSize   : "13px",
                  color      : "#5D6D7E",
                  fontFamily : "Arial",
                  marginBottom: "4px",
                }}>
                  {i + 1}. {prompt}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: "12px" }}>
          <p style={{ fontFamily: "Arial", color: "#5D6D7E", fontSize: "14px" }}>
            Talk to your teacher to review the key concepts from this chapter before starting your project.
          </p>
        </div>
      )}

      {/* Encouragement */}
      <div style={{
        background   : "#EBF5FB",
        borderRadius : "10px",
        padding      : "14px",
        marginBottom : "16px",
      }}>
        <p style={{ fontSize: "13px", color: "#1A5276", fontFamily: "Arial" }}>
          💡 <strong>Remember:</strong> Your project is still an opportunity to show what you know.
          Use your notes and what you've learned to create something great.
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={() => onNavigate("projectPlanning")}
        style={{ width: "100%", padding: "14px" }}
      >
        Continue to Project Planning →
      </button>
    </div>
  )
}
