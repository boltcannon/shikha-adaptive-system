import React, { useState, useEffect } from "react"

export default function QuestionCard({ question, onAnswer, loading }) {
  const [selected, setSelected] = useState(null)

  // Reset selection whenever a new question is passed in
  useEffect(() => {
    setSelected(null)
  }, [question])

  const handleSelect = (option) => {
    if (loading || selected) return
    setSelected(option)
    onAnswer(option)
  }

  if (!question) return null

  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)"
    }}>
      <p style={{
        fontSize: "16px",
        color: "#2C3E50",
        fontFamily: "Arial",
        marginBottom: "20px",
        lineHeight: "1.6",
        fontWeight: "500"
      }}>
        {question.text}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {question.options && question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(option)}
            disabled={loading || !!selected}
            style={{
              background: selected === option ? "#1A5276" : "white",
              color: selected === option ? "white" : "#2C3E50",
              border: "2px solid",
              borderColor: selected === option ? "#1A5276" : "#BDC3C7",
              borderRadius: "8px",
              padding: "12px 16px",
              cursor: loading || selected ? "not-allowed" : "pointer",
              fontFamily: "Arial",
              fontSize: "14px",
              textAlign: "left",
              transition: "all 0.2s"
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
