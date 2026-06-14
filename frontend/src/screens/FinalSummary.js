import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"

export default function FinalSummary({ onNavigate }) {
  const {
    sessionId,
    studentId,
    studentProgress,
    unitInput,
    currentUser,
  } = useUnit()

  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState("")

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    loadSummary()
  }, [sessionId]) // eslint-disable-line

  const loadSummary = async () => {
    setLoading(true)
    setError("")

    console.log("FinalSummary — studentId:", studentId)
    console.log("FinalSummary — currentUser:", currentUser?.user_id)
    console.log("FinalSummary — sessionId:", sessionId)
    console.log("FinalSummary — unitInput:", unitInput)

    try {
      const progress = studentProgress || {}
      const result = await api.generateFinalSummary(sessionId, {
        exit_ticket_score       : progress.exit_ticket_score,
        mastery_gate_result     : progress.mastery_gate_result || "",
        strong_subtopics        : progress.strong_subtopics    || [],
        weak_subtopics          : progress.weak_subtopics      || [],
        project_idea            : progress.project_idea        || "",
        provocation_observation : progress.provocation_observation || "",
      })
      setSummary(result)

      const idToUse = studentId || currentUser?.user_id
      console.log("FinalSummary — saving history with ID:", idToUse)

      if (idToUse) {
        try {
          const saveResult = await api.saveCompletedUnit(idToUse, {
            chapter             : unitInput?.chapter,
            grade               : unitInput?.grade,
            subject             : unitInput?.subject,
            context             : unitInput?.context,
            exit_ticket_score   : progress.exit_ticket_score,
            mastery_gate_result : progress.mastery_gate_result,
            strong_subtopics    : progress.strong_subtopics    || [],
            weak_subtopics      : progress.weak_subtopics      || [],
            project_idea        : progress.project_idea        || "",
            session_id          : sessionId,
          })
          console.log("FinalSummary — history saved:", saveResult)
        } catch (e) {
          console.error("FinalSummary — failed to save history:", e)
        }
      } else {
        console.error("FinalSummary — no studentId available, history not saved")
      }
    } catch (e) {
      console.error("FinalSummary — error:", e)
      setError("Could not generate your summary. Please try again.")
    }
    setLoading(false)
  }

  if (loading) return <SimpleLoader />

  if (error) return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <p style={{ color: "#C0392B", fontFamily: "Arial", marginBottom: "16px" }}>{error}</p>
      <button className="btn-primary" onClick={loadSummary}>Try Again</button>
    </div>
  )

  if (!summary) return null

  const chapter = unitInput?.chapter || "this chapter"

  return (
    <div>
      {/* Header */}
      <div style={{
        background: "#1A5276", borderRadius: "12px",
        padding: "24px", marginBottom: "24px", textAlign: "center",
      }}>
        <p style={{
          fontSize: "11px", letterSpacing: "2px", color: "#E87722",
          fontFamily: "Arial", fontWeight: "bold", marginBottom: "8px",
        }}>
          LEARNING COMPLETE
        </p>
        <p style={{ fontSize: "32px", marginBottom: "8px" }}>🎓</p>
        <h1 style={{
          fontSize: "22px", fontWeight: "bold", color: "white",
          fontFamily: "Arial", marginBottom: "8px",
        }}>
          You finished {chapter}!
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontFamily: "Arial" }}>
          Here is your AI teacher's summary of your journey.
        </p>
      </div>

      {/* Teacher message */}
      {summary.teacher_message && (
        <div className="card" style={{
          background: "#FEF9E7", border: "1px solid #F9E79F", marginBottom: "20px",
        }}>
          <p style={{
            fontSize: "11px", color: "#B7950B", fontFamily: "Arial",
            fontWeight: "bold", letterSpacing: "1px", marginBottom: "8px",
          }}>
            YOUR AI TEACHER SAYS
          </p>
          <p style={{
            fontFamily: "Arial", fontSize: "15px", color: "#7D6608", lineHeight: "1.7",
          }}>
            {summary.teacher_message}
          </p>
        </div>
      )}

      {/* Growth highlight */}
      {summary.growth_highlight && (
        <div className="card" style={{
          background: "#D5F5E3", border: "1px solid #1E8449", marginBottom: "20px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "20px", marginBottom: "8px" }}>⭐</p>
          <p style={{
            fontFamily: "Arial", fontSize: "14px", color: "#1E8449",
            fontWeight: "500", lineHeight: "1.6",
          }}>
            {summary.growth_highlight}
          </p>
        </div>
      )}

      {/* Strengths */}
      {summary.strengths?.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{
            fontSize: "11px", color: "#1A5276", fontFamily: "Arial",
            fontWeight: "bold", letterSpacing: "1px", marginBottom: "12px",
          }}>
            WHAT YOU DID WELL
          </p>
          {summary.strengths.map((s, i) => (
            <div key={i} style={{
              display: "flex", gap: "10px", alignItems: "flex-start",
              marginBottom: i < summary.strengths.length - 1 ? "10px" : "0",
            }}>
              <span style={{
                background: "#1E8449", color: "white", borderRadius: "50%",
                width: "20px", height: "20px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "bold",
              }}>✓</span>
              <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.5" }}>
                {s}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Areas to improve */}
      {summary.areas_to_improve?.length > 0 && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{
            fontSize: "11px", color: "#E87722", fontFamily: "Arial",
            fontWeight: "bold", letterSpacing: "1px", marginBottom: "12px",
          }}>
            KEEP WORKING ON
          </p>
          {summary.areas_to_improve.map((a, i) => (
            <div key={i} style={{
              display: "flex", gap: "10px", alignItems: "flex-start",
              marginBottom: i < summary.areas_to_improve.length - 1 ? "10px" : "0",
            }}>
              <span style={{
                background: "#E87722", color: "white", borderRadius: "50%",
                width: "20px", height: "20px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "11px", fontWeight: "bold",
              }}>→</span>
              <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50", lineHeight: "1.5" }}>
                {a}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Next steps */}
      {summary.next_steps?.length > 0 && (
        <div className="card" style={{ background: "#EBF5FB", marginBottom: "24px" }}>
          <p style={{
            fontSize: "11px", color: "#1A5276", fontFamily: "Arial",
            fontWeight: "bold", letterSpacing: "1px", marginBottom: "12px",
          }}>
            NEXT STEPS
          </p>
          {summary.next_steps.map((step, i) => (
            <p key={i} style={{
              fontFamily: "Arial", fontSize: "14px", color: "#2C3E50",
              lineHeight: "1.6",
              marginBottom: i < summary.next_steps.length - 1 ? "8px" : "0",
            }}>
              {i + 1}. {step}
            </p>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        className="btn-primary"
        onClick={() => onNavigate("teacherInput")}
        style={{ width: "100%", padding: "16px", fontSize: "15px" }}
      >
        Start a New Unit →
      </button>
    </div>
  )
}
