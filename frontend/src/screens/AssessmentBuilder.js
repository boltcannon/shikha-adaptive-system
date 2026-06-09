import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import { exportAssessmentAsPDF } from "../utils/exportAssessment"
import SimpleLoader from "../components/SimpleLoader"

export default function AssessmentBuilder({ onBack }) {
  const { sessionId, unitInput } = useUnit()

  const [questions,       setQuestions]   = useState(null)
  const [loading,         setLoading]     = useState(true)
  const [exporting,       setExporting]   = useState(false)
  const [exportType,      setExportType]  = useState(null) // "paper" | "key"
  const [schoolName,      setSchoolName]  = useState("Shikha Academy")
  const [assessmentTitle, setTitle]       = useState("")
  const [error,           setError]       = useState("")

  useEffect(() => { loadQuestions() }, []) // eslint-disable-line

  const loadQuestions = async () => {
    setLoading(true)
    setError("")
    try {
      const result = await api.getMasteryQuestions(sessionId)
      if (result.questions) {
        setQuestions(result.questions)
        if (unitInput?.chapter) {
          setTitle(`${unitInput.chapter} — Class Assessment`)
        }
      } else {
        setError("No questions found. Generate a unit first.")
      }
    } catch (e) {
      setError("Could not load questions.")
    }
    setLoading(false)
  }

  const handleExport = async (includeAnswers) => {
    if (!questions) return
    setExporting(true)
    setExportType(includeAnswers ? "key" : "paper")
    try {
      exportAssessmentAsPDF(questions, unitInput, {
        includeAnswers,
        title     : assessmentTitle,
        schoolName,
      })
    } catch (e) {
      setError("Export failed. Try again.")
      console.error("PDF export error:", e)
    }
    setExporting(false)
    setExportType(null)
  }

  // ── Derived counts ───────────────────────────────────────────────
  const totalQuestions = questions
    ? Object.values(questions).reduce((acc, d) => {
        if (!d) return acc
        return acc
          + (d.knowledge || []).filter(Boolean).length
          + (d.skills    || []).filter(Boolean).length
      }, 0)
    : 0

  const totalKnowledge = questions
    ? Object.values(questions).reduce(
        (acc, d) => acc + (d?.knowledge || []).filter(Boolean).length, 0)
    : 0

  const totalSkills = questions
    ? Object.values(questions).reduce(
        (acc, d) => acc + (d?.skills || []).filter(Boolean).length, 0)
    : 0

  if (loading) return <SimpleLoader />

  return (
    <div>
      {/* ── Page header ─────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: "24px",
      }}>
        <div>
          <h1 style={{
            fontSize: "24px", fontWeight: "bold",
            color: "#1A5276", fontFamily: "Arial", marginBottom: "4px",
          }}>
            Assessment Builder
          </h1>
          <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
            Export mastery gate questions as a printable question paper
          </p>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: "8px 16px", background: "white",
              color: "#1A5276", border: "2px solid #1A5276",
              borderRadius: "8px", cursor: "pointer",
              fontFamily: "Arial", fontSize: "13px", fontWeight: "bold",
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error && (
        <div style={{
          background: "#FADBD8", border: "1px solid #C0392B",
          borderRadius: "8px", padding: "12px 16px",
          marginBottom: "16px", color: "#C0392B",
          fontFamily: "Arial", fontSize: "13px",
        }}>
          {error}
        </div>
      )}

      {/* ── Unit info card ───────────────────────────────── */}
      <div className="card" style={{ background: "#1A5276", marginBottom: "20px" }}>
        <p style={{
          color: "rgba(255,255,255,0.6)", fontSize: "11px",
          fontFamily: "Arial", letterSpacing: "1px",
          fontWeight: "bold", marginBottom: "6px",
        }}>
          CURRENT UNIT
        </p>
        <p style={{
          color: "white", fontSize: "17px",
          fontWeight: "bold", fontFamily: "Arial", marginBottom: "4px",
        }}>
          {unitInput?.chapter || "No chapter selected"}
        </p>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", fontFamily: "Arial" }}>
          {[unitInput?.grade, unitInput?.subject].filter(Boolean).join(" · ")}
        </p>
      </div>

      {/* ── Stats row ───────────────────────────────────── */}
      {questions && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <div style={{
            flex: 1, minWidth: "80px",
            background: "#EBF5FB", borderRadius: "10px",
            padding: "14px", textAlign: "center",
          }}>
            <p style={{
              fontSize: "30px", fontWeight: "bold",
              color: "#1A5276", fontFamily: "Arial", lineHeight: 1,
            }}>
              {totalQuestions}
            </p>
            <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial", marginTop: "4px" }}>
              Total Questions
            </p>
          </div>

          <div style={{
            flex: 1, minWidth: "80px",
            background: "#D5F5E3", borderRadius: "10px",
            padding: "14px", textAlign: "center",
          }}>
            <p style={{
              fontSize: "30px", fontWeight: "bold",
              color: "#1E8449", fontFamily: "Arial", lineHeight: 1,
            }}>
              {Object.keys(questions).length}
            </p>
            <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial", marginTop: "4px" }}>
              Sub-topics
            </p>
          </div>

          <div style={{
            flex: 1, minWidth: "80px",
            background: "#FEF9E7", borderRadius: "10px",
            padding: "14px", textAlign: "center",
          }}>
            <p style={{
              fontSize: "18px", fontWeight: "bold",
              color: "#B7950B", fontFamily: "Arial", lineHeight: 1.3,
            }}>
              {totalKnowledge}K + {totalSkills}S
            </p>
            <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial", marginTop: "4px" }}>
              Knowledge + Skills
            </p>
          </div>
        </div>
      )}

      {/* ── Customise card ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <p style={{
          fontWeight: "bold", fontSize: "14px",
          color: "#1A5276", fontFamily: "Arial", marginBottom: "16px",
        }}>
          Customise Your Paper
        </p>

        <label style={{
          display: "block", marginBottom: "6px",
          fontWeight: "bold", fontSize: "13px",
          color: "#1A5276", fontFamily: "Arial",
        }}>
          Assessment Title
        </label>
        <input
          type="text"
          value={assessmentTitle}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Integers — Class Assessment"
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid #BDC3C7", fontFamily: "Arial",
            fontSize: "14px", marginBottom: "12px", boxSizing: "border-box",
          }}
        />

        <label style={{
          display: "block", marginBottom: "6px",
          fontWeight: "bold", fontSize: "13px",
          color: "#1A5276", fontFamily: "Arial",
        }}>
          School Name
        </label>
        <input
          type="text"
          value={schoolName}
          onChange={e => setSchoolName(e.target.value)}
          placeholder="School name for header"
          style={{
            width: "100%", padding: "10px", borderRadius: "8px",
            border: "1px solid #BDC3C7", fontFamily: "Arial",
            fontSize: "14px", boxSizing: "border-box",
          }}
        />
      </div>

      {/* ── Question preview ─────────────────────────────── */}
      {questions && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <p style={{
            fontWeight: "bold", fontSize: "14px",
            color: "#1A5276", fontFamily: "Arial", marginBottom: "12px",
          }}>
            Question Preview
          </p>

          {Object.entries(questions).map(([key, data]) => {
            if (!data) return null
            const allQ = [
              ...(data.knowledge || []).filter(Boolean),
              ...(data.skills    || []).filter(Boolean),
            ]
            if (allQ.length === 0) return null

            const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())

            return (
              <div key={key} style={{
                marginBottom: "12px", paddingBottom: "12px",
                borderBottom: "1px solid #F2F3F4",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{
                    background: "#1A5276", color: "white",
                    borderRadius: "4px", padding: "2px 8px",
                    fontSize: "10px", fontFamily: "Arial",
                    fontWeight: "bold", letterSpacing: "0.5px",
                  }}>
                    {label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "11px", color: "#95A5A6", fontFamily: "Arial" }}>
                    {allQ.length} question{allQ.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {allQ.slice(0, 2).map((q, i) => (
                  <p key={i} style={{
                    fontSize: "12px", color: "#5D6D7E",
                    fontFamily: "Arial", marginBottom: "4px",
                    lineHeight: "1.4",
                  }}>
                    • {q.text?.substring(0, 75)}{q.text?.length > 75 ? "…" : ""}
                  </p>
                ))}

                {allQ.length > 2 && (
                  <p style={{
                    fontSize: "11px", color: "#BDC3C7",
                    fontFamily: "Arial", fontStyle: "italic",
                  }}>
                    +{allQ.length - 2} more question{allQ.length - 2 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Export buttons ───────────────────────────────── */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => handleExport(false)}
          disabled={exporting || !questions}
          style={{
            flex: 1, padding: "14px",
            background: (exporting && exportType === "paper") ? "#BDC3C7" : "#1A5276",
            color: "white", border: "none",
            borderRadius: "8px", fontFamily: "Arial",
            fontSize: "14px", fontWeight: "bold",
            cursor: (exporting || !questions) ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {exporting && exportType === "paper" ? "Generating…" : "⬇ Download Question Paper"}
        </button>

        <button
          onClick={() => handleExport(true)}
          disabled={exporting || !questions}
          style={{
            flex: 1, padding: "14px",
            background: (exporting && exportType === "key") ? "#F2F3F4" : "white",
            color: "#1A5276",
            border: "2px solid #1A5276",
            borderRadius: "8px", fontFamily: "Arial",
            fontSize: "14px", fontWeight: "bold",
            cursor: (exporting || !questions) ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {exporting && exportType === "key" ? "Generating…" : "⬇ Download Answer Key"}
        </button>
      </div>

      <p style={{
        fontSize: "11px", color: "#BDC3C7",
        fontFamily: "Arial", textAlign: "center",
        marginTop: "10px", lineHeight: "1.5",
      }}>
        Question Paper — student version without answers
        &nbsp;·&nbsp;
        Answer Key — teacher version with correct answers highlighted in green
      </p>
    </div>
  )
}
