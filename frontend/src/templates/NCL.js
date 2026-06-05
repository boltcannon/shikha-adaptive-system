import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"
import QuizRunner from "../components/QuizRunner"

const DEFAULT_SUBTOPIC = "core concepts"

export default function NCL({ onNavigate }) {
  const { sessionId, unitInput, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [exitDone,  setExitDone]  = useState(false)
  const [exitScore, setExitScore] = useState(0)

  const subtopic = unitInput?.chapter || DEFAULT_SUBTOPIC

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateNCL(sessionId, subtopic)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const handleContinue = () => {
    addCompletedTemplate("ncl")
    saveStudentProgress({
      current_screen   : "analysis",
      exit_ticket_score: `${exitScore}/${data?.questions?.length ?? 0}`,
    })
    onNavigate("analysis")
  }

  if (loading) return <SimpleLoader />
  if (!data) return (
    <p style={{ fontFamily: "Arial", color: "#C0392B" }}>
      Failed to load NCL content.
    </p>
  )

  return (
    <div>
      <TemplateHeader template="NCL" subtitle={data.subtopic_name} />

      {/* ── Concept card ──────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <h2 className="heading-2" style={{ marginBottom: "12px" }}>
          {data.subtopic_name}
        </h2>
        <p style={{
          fontFamily: "Arial", fontSize: "14px", color: "#2C3E50",
          lineHeight: "1.7", marginBottom: "12px",
        }}>
          {data.concept_explanation}
        </p>
        {data.real_world_connection && (
          <div style={{ background: "#EBF5FB", borderRadius: "8px", padding: "12px" }}>
            <p style={{
              fontFamily: "Arial", fontSize: "13px", color: "#1A5276",
              fontWeight: "bold", marginBottom: "4px",
            }}>
              Real-world connection
            </p>
            <p style={{
              fontFamily: "Arial", fontSize: "13px",
              color: "#2C3E50", lineHeight: "1.5",
            }}>
              {data.real_world_connection}
            </p>
          </div>
        )}
      </div>

      {/* ── Key facts ─────────────────────────────────────── */}
      {data.key_facts?.length > 0 && (
        <div className="card" style={{ marginBottom: "24px" }}>
          <p style={{
            fontFamily: "Arial", fontWeight: "bold",
            fontSize: "13px", color: "#1A5276", marginBottom: "8px",
          }}>
            Key Facts
          </p>
          {data.key_facts.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <span style={{ color: "#E87722", fontWeight: "bold" }}>•</span>
              <p style={{
                fontFamily: "Arial", fontSize: "13px",
                color: "#2C3E50", lineHeight: "1.5",
              }}>
                {f}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Exit ticket quiz ───────────────────────────────── */}
      <QuizRunner
        questions={data.questions || []}
        subtopic={subtopic}
        title="Exit Ticket"
        subtitle={`${data.questions?.length || 0} questions — answer all then submit`}
        onComplete={(score, results) => {
          setExitScore(score)
          setExitDone(true)
          saveStudentProgress({
            exit_ticket_score: score,
            current_screen   : "analysis",
          })
        }}
      />

      {/* ── Continue button (appears after quiz is done) ───── */}
      {exitDone && (
        <div style={{ marginTop: "20px" }}>
          <button
            className="btn-primary"
            onClick={handleContinue}
            style={{ width: "100%", padding: "14px" }}
          >
            Continue to Analysis →
          </button>
        </div>
      )}
    </div>
  )
}
