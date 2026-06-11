import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"

export default function NclReview({ onNavigate }) {
  const {
    sessionId,
    studentProgress,
    saveStudentProgress,
  } = useUnit()

  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  const weakSubtopics  = studentProgress?.weak_subtopics      || []
  const wrongQuestions = studentProgress?.wrong_questions_ncl  || []
  const exitScore      = studentProgress?.exit_ticket_score

  useEffect(() => {
    loadReview()
  }, []) // eslint-disable-line

  const loadReview = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await api.generateNclReview(
        sessionId,
        weakSubtopics,
        wrongQuestions
      )
      setContent(result)
    } catch (e) {
      setError("Could not load review content.")
    }
    setLoading(false)
  }

  if (loading) return <SimpleLoader />

  return (
    <div>
      {/* Header */}
      <div style={{
        background   : "#FADBD8",
        border       : "2px solid #C0392B",
        borderRadius : "12px",
        padding      : "20px",
        marginBottom : "20px",
        textAlign    : "center",
      }}>
        <p style={{ fontSize: "32px", marginBottom: "8px" }}>📚</p>
        <h2 style={{
          fontSize    : "20px",
          fontWeight  : "bold",
          color       : "#C0392B",
          fontFamily  : "Arial",
          marginBottom: "4px",
        }}>
          Let's Try a Different Approach
        </h2>
        <p style={{ fontSize: "13px", color: "#C0392B", fontFamily: "Arial" }}>
          Exit ticket score: {exitScore !== null && exitScore !== undefined ? exitScore : "—"} — some concepts need more attention
        </p>
      </div>

      {/* Weak subtopics */}
      {weakSubtopics.length > 0 && (
        <div style={{
          background   : "#FEF9E7",
          borderRadius : "10px",
          padding      : "14px 16px",
          marginBottom : "16px",
        }}>
          <p style={{
            fontSize      : "11px",
            fontWeight    : "bold",
            color         : "#B7950B",
            fontFamily    : "Arial",
            marginBottom  : "8px",
            textTransform : "uppercase",
          }}>
            Focusing on these topics
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {weakSubtopics.map(st => (
              <span key={st} style={{
                background  : "white",
                border      : "1px solid #B7950B",
                borderRadius: "12px",
                padding     : "3px 10px",
                fontSize    : "12px",
                color       : "#B7950B",
                fontFamily  : "Arial",
                fontWeight  : "bold",
              }}>
                {st.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {content && (
        <div>
          {/* What went wrong */}
          <div className="card" style={{
            marginBottom: "16px",
            borderLeft  : "4px solid #E87722",
          }}>
            <p style={{
              fontSize  : "14px",
              color     : "#2C3E50",
              fontFamily: "Arial",
              lineHeight: "1.7",
            }}>
              {content.what_went_wrong}
            </p>
          </div>

          {/* Fresh explanation */}
          <div className="card" style={{
            marginBottom: "16px",
            background  : "#EBF5FB",
          }}>
            <p style={{
              fontSize      : "12px",
              fontWeight    : "bold",
              color         : "#1A5276",
              fontFamily    : "Arial",
              marginBottom  : "10px",
              textTransform : "uppercase",
            }}>
              A Fresh Explanation
            </p>
            <p style={{
              fontSize  : "15px",
              color     : "#2C3E50",
              fontFamily: "Arial",
              lineHeight: "1.8",
              whiteSpace: "pre-line",
            }}>
              {content.fresh_explanation}
            </p>
          </div>

          {/* Key insight */}
          <div style={{
            background   : "#1A5276",
            borderRadius : "10px",
            padding      : "16px",
            marginBottom : "16px",
          }}>
            <p style={{
              fontSize      : "11px",
              fontWeight    : "bold",
              color         : "#E87722",
              fontFamily    : "Arial",
              marginBottom  : "6px",
              textTransform : "uppercase",
            }}>
              The Key Insight
            </p>
            <p style={{
              fontSize  : "15px",
              color     : "white",
              fontFamily: "Arial",
              lineHeight: "1.6",
              fontWeight: "500",
            }}>
              {content.key_insight}
            </p>
          </div>

          {/* Practice tip */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <p style={{
              fontSize      : "11px",
              fontWeight    : "bold",
              color         : "#1E8449",
              fontFamily    : "Arial",
              marginBottom  : "6px",
              textTransform : "uppercase",
            }}>
              Practice Tip
            </p>
            <p style={{
              fontSize  : "14px",
              color     : "#2C3E50",
              fontFamily: "Arial",
              lineHeight: "1.6",
            }}>
              {content.practice_tip}
            </p>
          </div>

          {/* Encouragement */}
          <div style={{
            background   : "#D5F5E3",
            borderRadius : "10px",
            padding      : "16px",
            marginBottom : "24px",
            textAlign    : "center",
          }}>
            <p style={{
              fontSize  : "14px",
              color     : "#1E8449",
              fontFamily: "Arial",
              lineHeight: "1.6",
            }}>
              {content.encouragement}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{ color: "#C0392B", fontFamily: "Arial", fontSize: "13px" }}>
            {error}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => {
            saveStudentProgress({ current_screen: "ncl" })
            onNavigate("ncl")
          }}
          style={{
            flex        : 1,
            padding     : "12px",
            background  : "white",
            color       : "#1A5276",
            border      : "2px solid #1A5276",
            borderRadius: "8px",
            cursor      : "pointer",
            fontFamily  : "Arial",
            fontSize    : "14px",
          }}
        >
          ← Review NCL Again
        </button>
        <button
          onClick={() => {
            saveStudentProgress({ current_screen: "analysis" })
            onNavigate("analysis")
          }}
          className="btn-primary"
          style={{ flex: 1, padding: "12px" }}
        >
          I'm Ready → Continue
        </button>
      </div>
    </div>
  )
}
