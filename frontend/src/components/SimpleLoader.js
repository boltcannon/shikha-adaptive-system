import React from "react"

/**
 * Standardised full-page loading state used across all templates.
 * Shows an orange spinner + "We are almost there..." message.
 */
export default function SimpleLoader() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "40vh",
      gap: "20px"
    }}>
      <div style={{
        width: "48px",
        height: "48px",
        border: "4px solid #F2F3F4",
        borderTop: "4px solid #E87722",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{
        fontSize: "15px",
        color: "#5D6D7E",
        fontFamily: "Arial",
        textAlign: "center"
      }}>
        We are almost there...
      </p>
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
