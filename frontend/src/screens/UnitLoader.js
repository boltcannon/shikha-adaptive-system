import React, { useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"

export default function UnitLoader({ onNavigate }) {
  const { sessionId, unitInput, setGeneratedContent } = useUnit()

  useEffect(() => {
    if (!sessionId) {
      onNavigate("teacherInput")
      return
    }
    startGeneration()
  }, [sessionId]) // eslint-disable-line

  const startGeneration = async () => {
    try {
      const result = await api.generateAll(sessionId)
      // result.source is "cache" or "generated" — both mean success
      if (result.source) {
        if (result.content) setGeneratedContent(result.content)
        setTimeout(() => onNavigate("provocation"), 1000)
      } else {
        onNavigate("teacherInput")
      }
    } catch (e) {
      onNavigate("teacherInput")
    }
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "70vh",
      gap: "32px"
    }}>
      {/* Spinning loader */}
      <div style={{
        width: "64px",
        height: "64px",
        border: "5px solid #F2F3F4",
        borderTop: "5px solid #E87722",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />

      {/* Simple message */}
      <div style={{ textAlign: "center" }}>
        <h2 style={{
          fontSize: "22px",
          color: "#1A5276",
          fontFamily: "Arial",
          fontWeight: "bold",
          marginBottom: "8px"
        }}>
          We are almost there...
        </h2>
        <p style={{
          fontSize: "14px",
          color: "#5D6D7E",
          fontFamily: "Arial"
        }}>
          {unitInput && unitInput.context && unitInput.context !== "general"
            ? `Building your ${unitInput.context} unit`
            : "Building your unit"}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
