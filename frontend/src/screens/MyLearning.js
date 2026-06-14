import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"

export default function MyLearning({ onNavigate }) {
  const { studentId, currentUser } = useUnit()

  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [studentId]) // eslint-disable-line

  const loadHistory = async () => {
    const idToUse = studentId || currentUser?.user_id
    if (!idToUse) {
      setLoading(false)
      return
    }
    try {
      const data = await api.getStudentHistory(idToUse)
      setHistory(data)
    } catch (e) {
      console.error("MyLearning — could not load history:", e)
    }
    setLoading(false)
  }

  if (loading) return <SimpleLoader />

  const stats = history?.stats || {}
  const units = history?.completed_units || []

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "24px",
      }}>
        <div>
          <h1 style={{
            fontSize: "24px", fontWeight: "bold",
            color: "#1A5276", fontFamily: "Arial", marginBottom: "4px",
          }}>
            My Learning
          </h1>
          <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
            {currentUser?.name}
          </p>
        </div>
        <button
          onClick={() => onNavigate("teacherInput")}
          className="btn-primary"
          style={{ padding: "10px 16px", fontSize: "13px" }}
        >
          + Start New Unit
        </button>
      </div>

      {units.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={{ fontSize: "60px", marginBottom: "16px" }}>📚</p>
          <h2 style={{
            fontSize: "20px", fontWeight: "bold",
            color: "#1A5276", fontFamily: "Arial", marginBottom: "8px",
          }}>
            No units completed yet
          </h2>
          <p style={{
            fontSize: "14px", color: "#5D6D7E",
            fontFamily: "Arial", marginBottom: "24px",
          }}>
            Complete your first learning unit to see your progress here.
          </p>
          <button
            className="btn-primary"
            onClick={() => onNavigate("teacherInput")}
            style={{ padding: "14px 32px" }}
          >
            Start Learning →
          </button>
        </div>
      ) : (
        <div>
          {/* Stats row */}
          <div style={{
            display: "flex", gap: "12px",
            marginBottom: "20px", flexWrap: "wrap",
          }}>
            {[
              {
                label: "Units Completed",
                value: stats.total_units_completed || 0,
                color: "#1A5276", bg: "#EBF5FB", icon: "📚",
              },
              {
                label: "Avg Exit Score",
                value: stats.avg_exit_score ? `${stats.avg_exit_score}/5` : "—",
                color: "#1E8449", bg: "#D5F5E3", icon: "✓",
              },
              {
                label: "Subjects Studied",
                value: stats.subjects_studied?.length || 0,
                color: "#B7950B", bg: "#FEF9E7", icon: "🎯",
              },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, minWidth: "100px",
                background: stat.bg, borderRadius: "12px",
                padding: "16px", textAlign: "center",
              }}>
                <p style={{ fontSize: "24px", marginBottom: "4px" }}>{stat.icon}</p>
                <p style={{
                  fontSize: "24px", fontWeight: "bold",
                  color: stat.color, fontFamily: "Arial", marginBottom: "2px",
                }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Strong and weak topics */}
          {(stats.top_strong_topics?.length > 0 || stats.top_weak_topics?.length > 0) && (
            <div style={{
              display: "flex", gap: "12px",
              marginBottom: "20px", flexWrap: "wrap",
            }}>
              {stats.top_strong_topics?.length > 0 && (
                <div style={{
                  flex: 1, background: "#D5F5E3",
                  borderRadius: "10px", padding: "14px", minWidth: "140px",
                }}>
                  <p style={{
                    fontSize: "11px", fontWeight: "bold", color: "#1E8449",
                    fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase",
                  }}>
                    ★ Strong Topics
                  </p>
                  {stats.top_strong_topics.map(t => (
                    <p key={t} style={{
                      fontSize: "13px", color: "#1E8449",
                      fontFamily: "Arial", marginBottom: "4px",
                    }}>
                      • {t.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}

              {stats.top_weak_topics?.length > 0 && (
                <div style={{
                  flex: 1, background: "#FADBD8",
                  borderRadius: "10px", padding: "14px", minWidth: "140px",
                }}>
                  <p style={{
                    fontSize: "11px", fontWeight: "bold", color: "#C0392B",
                    fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase",
                  }}>
                    → Keep Practising
                  </p>
                  {stats.top_weak_topics.map(t => (
                    <p key={t} style={{
                      fontSize: "13px", color: "#C0392B",
                      fontFamily: "Arial", marginBottom: "4px",
                    }}>
                      • {t.replace(/_/g, " ")}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Completed units list */}
          <p style={{
            fontWeight: "bold", fontSize: "14px",
            color: "#1A5276", fontFamily: "Arial", marginBottom: "12px",
          }}>
            Completed Units ({units.length})
          </p>

          {units.map((unit, i) => {
            const score   = unit.exit_ticket_score
            const mastery = unit.mastery_gate_result || ""
            const isGreen = mastery.includes("green")
            const isAmber = mastery.includes("amber")

            const date = unit.completed_at
              ? new Date(unit.completed_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                })
              : ""

            return (
              <div key={i} className="card" style={{ marginBottom: "10px" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: "8px",
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontWeight: "bold", fontSize: "15px",
                      color: "#1A5276", fontFamily: "Arial", marginBottom: "2px",
                    }}>
                      {unit.chapter}
                    </p>
                    <p style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial" }}>
                      {unit.grade} · {unit.subject}
                      {unit.context && unit.context !== "general" ? ` · ${unit.context}` : ""}
                    </p>
                  </div>
                  <p style={{
                    fontSize: "11px", color: "#BDC3C7",
                    fontFamily: "Arial", marginLeft: "8px", flexShrink: 0,
                  }}>
                    {date}
                  </p>
                </div>

                {/* Score badges */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {score != null ? (
                    <span style={{
                      background  : score >= 4 ? "#D5F5E3" : score >= 2 ? "#FEF9E7" : "#FADBD8",
                      color       : score >= 4 ? "#1E8449" : score >= 2 ? "#B7950B" : "#C0392B",
                      padding     : "3px 10px", borderRadius: "10px",
                      fontSize    : "12px", fontWeight: "bold", fontFamily: "Arial",
                    }}>
                      Exit: {score}/5
                    </span>
                  ) : (
                    <span style={{
                      background: "#F2F3F4", color: "#BDC3C7",
                      padding: "3px 10px", borderRadius: "10px",
                      fontSize: "12px", fontFamily: "Arial",
                    }}>
                      Score not recorded
                    </span>
                  )}
                  {mastery && (
                    <span style={{
                      background  : isGreen ? "#D5F5E3" : isAmber ? "#FEF9E7" : "#FADBD8",
                      color       : isGreen ? "#1E8449" : isAmber ? "#B7950B" : "#C0392B",
                      padding     : "3px 10px", borderRadius: "10px",
                      fontSize    : "12px", fontWeight: "bold", fontFamily: "Arial",
                    }}>
                      Mastery: {mastery}
                    </span>
                  )}
                  {unit.project_idea && (
                    <span style={{
                      background: "#EBF5FB", color: "#1A5276",
                      padding: "3px 10px", borderRadius: "10px",
                      fontSize: "12px", fontFamily: "Arial",
                    }}>
                      📝 {unit.project_idea.substring(0, 30)}{unit.project_idea.length > 30 ? "..." : ""}
                    </span>
                  )}
                </div>

                {unit.weak_subtopics?.length > 0 && (
                  <p style={{
                    fontSize: "11px", color: "#C0392B",
                    fontFamily: "Arial", marginTop: "8px",
                  }}>
                    Review: {unit.weak_subtopics.join(", ").replace(/_/g, " ")}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
