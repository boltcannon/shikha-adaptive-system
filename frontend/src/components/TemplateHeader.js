import React from "react"

export default function TemplateHeader({ template, subtitle }) {
  return (
    <div style={{
      display: "flex",
      gap: "8px",
      marginBottom: "24px",
      flexWrap: "wrap"
    }}>
      <span style={{
        background: "#1A5276",
        color: "white",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "bold",
        fontFamily: "Arial"
      }}>
        {template}
      </span>
      {subtitle && (
        <span style={{
          background: "#E87722",
          color: "white",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "bold",
          fontFamily: "Arial"
        }}>
          {subtitle}
        </span>
      )}
    </div>
  )
}
