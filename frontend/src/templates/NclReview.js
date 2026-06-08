import React from "react"
import { useUnit } from "../context/UnitContext"
import TemplateHeader from "../components/TemplateHeader"

export default function NclReview({ onNavigate }) {
  const { generatedContent, performance } = useUnit()

  const nclData  = generatedContent?.ncl || {}
  const subtopics = generatedContent?.subtopics?.subtopics || []
  const score    = performance?.exitTicketScore || "—"

  return (
    <div>
      <TemplateHeader template="NCL REVIEW" subtitle="Strengthen Your Understanding" />

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
          fontSize   : "28px",
          fontWeight : "bold",
          color      : "#C0392B",
          fontFamily : "Arial",
          marginBottom: "6px",
        }}>
          Exit Ticket: {score}
        </p>
        <p style={{ fontSize: "14px", color: "#922B21", fontFamily: "Arial" }}>
          Some concepts need more attention. Review the key ideas below before moving on.
        </p>
      </div>

      {/* Key concepts per subtopic */}
      {subtopics.length > 0 ? subtopics.map(st => {
        const ncl = nclData[st.key]
        if (!ncl) return null
        return (
          <div key={st.key} className="card" style={{ marginBottom: "12px" }}>
            <p style={{
              fontSize       : "12px",
              fontWeight     : "bold",
              color          : "#1A5276",
              fontFamily     : "Arial",
              marginBottom   : "6px",
              textTransform  : "uppercase",
              letterSpacing  : "0.5px",
            }}>
              {ncl.subtopic_name || st.label}
            </p>

            {ncl.concept_explanation && (
              <p style={{
                fontSize   : "14px",
                color      : "#2C3E50",
                fontFamily : "Arial",
                lineHeight : "1.6",
                marginBottom: "8px",
              }}>
                {ncl.concept_explanation}
              </p>
            )}

            {ncl.key_facts && ncl.key_facts.length > 0 && (
              <div>
                {ncl.key_facts.slice(0, 3).map((fact, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ color: "#E87722", fontWeight: "bold", flexShrink: 0 }}>•</span>
                    <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", margin: 0 }}>
                      {fact}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }) : (
        <div className="card" style={{ marginBottom: "12px" }}>
          <p style={{ fontFamily: "Arial", color: "#5D6D7E", fontSize: "14px" }}>
            Review your notes and your teacher's explanations before continuing.
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
          💡 <strong>Tip:</strong> Read through the key facts carefully. You can always ask your
          teacher for help if a concept is still unclear.
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={() => onNavigate("analysis")}
        style={{ width: "100%", padding: "14px" }}
      >
        I've reviewed — Continue to Analysis →
      </button>
    </div>
  )
}
