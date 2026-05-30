import React from "react"

// Bug 8 — isLast shows "See My Results →" on the final question instead of "Next Question →"
export default function FeedbackCard({ feedback, onNext, isLast }) {
  if (!feedback) return null

  const isCorrect = feedback.is_correct

  return (
    <div style={{
      background: isCorrect ? "#D5F5E3" : "#FADBD8",
      border: `2px solid ${isCorrect ? "#1E8449" : "#C0392B"}`,
      borderRadius: "12px",
      padding: "20px",
      marginTop: "16px"
    }}>
      <p style={{
        fontWeight: "bold",
        color: isCorrect ? "#1E8449" : "#C0392B",
        marginBottom: "8px",
        fontFamily: "Arial",
        fontSize: "15px"
      }}>
        {isCorrect ? "✓ Correct!" : "Not quite..."}
      </p>
      <p style={{
        color: "#2C3E50",
        fontFamily: "Arial",
        fontSize: "14px",
        marginBottom: "8px",
        lineHeight: "1.6"
      }}>
        {feedback.feedback}
      </p>
      {!isCorrect && feedback.hint && (
        <p style={{
          color: "#5D6D7E",
          fontFamily: "Arial",
          fontSize: "13px",
          fontStyle: "italic",
          marginBottom: "8px"
        }}>
          💡 {feedback.hint}
        </p>
      )}
      <p style={{
        color: "#E87722",
        fontFamily: "Arial",
        fontSize: "13px",
        marginBottom: "16px"
      }}>
        {feedback.encouragement}
      </p>
      <button
        onClick={onNext}
        style={{
          background: "#1A5276",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 24px",
          cursor: "pointer",
          fontFamily: "Arial",
          fontSize: "14px"
        }}
      >
        {isLast ? "See My Results →" : "Next Question →"}
      </button>
    </div>
  )
}
