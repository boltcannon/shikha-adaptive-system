import React, { useState, useEffect } from "react"

const messages = [
  "Reading Shikha's MAT framework...",
  "Building your learning unit...",
  "Connecting concepts to your context...",
  "Generating scenarios...",
  "Almost ready..."
]

export default function LoadingScreen({ message }) {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      gap: "24px"
    }}>
      <div style={{
        width: "60px",
        height: "60px",
        border: "4px solid #F2F3F4",
        borderTop: "4px solid #E87722",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{
        fontSize: "16px",
        color: "#5D6D7E",
        fontFamily: "Arial",
        textAlign: "center"
      }}>
        {message || messages[msgIndex]}
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
