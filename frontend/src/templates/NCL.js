import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"
import QuizRunner from "../components/QuizRunner"

export default function NCL({ onNavigate }) {
  const {
    sessionId,
    generatedContent,
    nclProgress,
    updateNclProgress,
    saveStudentProgress,
    addCompletedTemplate,
  } = useUnit()

  const [loading, setLoading]           = useState(true)
  const [subtopics, setSubtopics]       = useState([])
  const [nclData, setNclData]           = useState({})
  const [currentIndex, setCurrentIndex] = useState(
    nclProgress?.currentSubtopicIndex || 0
  )
  const [phase, setPhase]               = useState(
    nclProgress?.phase || "learning"
  )
  const [learningStep, setLearningStep] = useState("instruction")
  const [exitQuestions, setExitQuestions] = useState([])
  const [exitScore, setExitScore]       = useState(null)
  const [error, setError]               = useState("")

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentIndex, phase, learningStep])

  useEffect(() => {
    loadContent()
  }, [generatedContent]) // eslint-disable-line

  const loadContent = async () => {
    setLoading(true)
    try {
      let subs = []
      if (generatedContent?.subtopics?.subtopics) {
        subs = generatedContent.subtopics.subtopics
      } else {
        const r = await api.generateSubtopics(sessionId)
        subs = r.subtopics || []
      }
      setSubtopics(subs)

      let ncl = {}
      if (generatedContent?.ncl) {
        ncl = generatedContent.ncl
      }
      setNclData(ncl)

      if (nclProgress?.completedSubtopics?.length > 0) {
        setCurrentIndex(nclProgress.currentSubtopicIndex || 0)
        setPhase(nclProgress.phase || "learning")
      }
    } catch (e) {
      setError("Could not load content. Try again.")
    }
    setLoading(false)
  }

  const currentSubtopic = subtopics[currentIndex]
  const currentNcl      = currentSubtopic ? nclData[currentSubtopic.key] : null
  const totalSubtopics  = subtopics.length
  const completedCount  = nclProgress?.completedSubtopics?.length || 0

  const handleSubtopicComplete = () => {
    const completed = [
      ...(nclProgress?.completedSubtopics || []),
      currentSubtopic?.key,
    ]

    if (currentIndex < totalSubtopics - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setLearningStep("instruction")
      updateNclProgress({
        completedSubtopics  : completed,
        currentSubtopicIndex: nextIndex,
        phase               : "learning",
      })
      saveStudentProgress({ ncl_completed_subtopics: completed })
    } else {
      setPhase("exit_ticket")
      updateNclProgress({
        completedSubtopics  : completed,
        currentSubtopicIndex: currentIndex,
        phase               : "exit_ticket",
      })
      loadExitTicket()
    }
  }

  const loadExitTicket = async () => {
    setLoading(true)
    try {
      const result = await api.getExitTicket(sessionId)
      setExitQuestions(result.questions || [])
    } catch (e) {
      setError("Could not load exit ticket.")
    }
    setLoading(false)
  }

  if (loading) return <SimpleLoader />
  if (error) return (
    <div style={{ textAlign: "center", padding: "40px", color: "#C0392B", fontFamily: "Arial" }}>
      <p>{error}</p>
      <button
        className="btn-primary"
        onClick={loadContent}
        style={{ marginTop: "16px" }}
      >
        Try Again
      </button>
    </div>
  )

  // ── EXIT TICKET PHASE ────────────────────────────────────
  if (phase === "exit_ticket") {
    if (exitQuestions.length === 0) return <SimpleLoader />

    if (exitScore !== null) {
      const pct    = exitScore / exitQuestions.length
      const colour = pct >= 0.8 ? "green" : pct >= 0.5 ? "amber" : "red"
      const bg     = colour === "green" ? "#D5F5E3" : colour === "amber" ? "#FEF9E7" : "#FADBD8"
      const border = colour === "green" ? "#1E8449" : colour === "amber" ? "#B7950B" : "#C0392B"

      return (
        <div>
          <TemplateHeader template="NEW CONTENT LEARNING" subtitle="Exit Ticket Complete" />
          <div style={{
            background: bg, border: `2px solid ${border}`,
            borderRadius: "12px", padding: "24px",
            textAlign: "center", marginBottom: "24px",
          }}>
            <p style={{
              fontSize: "48px", fontWeight: "bold", color: border,
              fontFamily: "Arial", marginBottom: "8px",
            }}>
              {exitScore}/{exitQuestions.length}
            </p>
            <p style={{ fontSize: "16px", color: "#2C3E50", fontFamily: "Arial" }}>
              {colour === "green"
                ? "Excellent! You are ready to continue."
                : colour === "amber"
                ? "Good effort. Keep these concepts in mind."
                : "Some concepts need more attention."}
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              addCompletedTemplate("ncl")
              updateNclProgress({ phase: "complete" })
              saveStudentProgress({
                exit_ticket_score: `${exitScore}/${exitQuestions.length}`,
                current_screen   : "analysis",
              })
              onNavigate("analysis")
            }}
            style={{ width: "100%", padding: "14px" }}
          >
            Continue to Analysis →
          </button>
        </div>
      )
    }

    return (
      <div>
        <TemplateHeader template="NEW CONTENT LEARNING" subtitle="Exit Ticket" />
        <div style={{
          background: "#EBF5FB", borderRadius: "10px",
          padding: "16px", marginBottom: "20px",
        }}>
          <p style={{
            fontSize: "14px", color: "#1A5276", fontFamily: "Arial",
            fontWeight: "bold", marginBottom: "4px",
          }}>
            You have completed all {totalSubtopics} sub-topics
          </p>
          <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
            This exit ticket checks your understanding across everything you just learned.
          </p>
        </div>
        <QuizRunner
          questions={exitQuestions}
          subtopic="ncl_exit_ticket"
          title="Exit Ticket"
          subtitle={`${exitQuestions.length} questions across all sub-topics`}
          onComplete={(score) => setExitScore(score)}
        />
      </div>
    )
  }

  // ── LEARNING PHASE ───────────────────────────────────────
  if (!currentSubtopic || !currentNcl) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p style={{ color: "#5D6D7E", fontFamily: "Arial", marginBottom: "16px" }}>
          Loading sub-topic content...
        </p>
        <SimpleLoader />
      </div>
    )
  }

  return (
    <div>
      <TemplateHeader
        template="NEW CONTENT LEARNING"
        subtitle={currentNcl.subtopic_name || currentSubtopic.label}
      />

      {/* Sub-topic progress pills */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {subtopics.map((st, i) => {
          const isDone    = nclProgress?.completedSubtopics?.includes(st.key)
          const isCurrent = i === currentIndex
          return (
            <span key={st.key} style={{
              padding: "4px 12px", borderRadius: "16px",
              fontSize: "12px", fontWeight: "bold", fontFamily: "Arial",
              background: isDone ? "#D5F5E3" : isCurrent ? "#FEF9E7" : "#F2F3F4",
              color: isDone ? "#1E8449" : isCurrent ? "#E87722" : "#BDC3C7",
            }}>
              {isDone ? "✓ " : ""}{st.label}
            </span>
          )
        })}
      </div>

      <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "20px" }}>
        Sub-topic {currentIndex + 1} of {totalSubtopics}
        {completedCount > 0 && ` · ${completedCount} completed`}
      </p>

      {/* INSTRUCTION STEP */}
      {learningStep === "instruction" && (
        <div>
          <div className="card" style={{ background: "#EBF5FB", marginBottom: "16px" }}>
            <h2 style={{
              fontSize: "20px", fontWeight: "bold", color: "#1A5276",
              fontFamily: "Arial", marginBottom: "12px",
            }}>
              {currentNcl.subtopic_name}
            </h2>
            <p style={{
              fontSize: "15px", color: "#2C3E50", fontFamily: "Arial",
              lineHeight: "1.7", marginBottom: "16px",
            }}>
              {currentNcl.concept_explanation}
            </p>

            {currentNcl.visual_description && (
              <div style={{
                background: "white", borderRadius: "8px", padding: "12px",
                marginBottom: "12px", border: "1px solid #AED6F1",
              }}>
                <p style={{
                  fontSize: "12px", fontWeight: "bold", color: "#1A5276",
                  fontFamily: "Arial", marginBottom: "6px", textTransform: "uppercase",
                }}>
                  Visual Aid
                </p>
                <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", fontStyle: "italic" }}>
                  {currentNcl.visual_description}
                </p>
              </div>
            )}

            {currentNcl.real_world_connection && (
              <div style={{ borderLeft: "4px solid #E87722", paddingLeft: "12px", marginBottom: "12px" }}>
                <p style={{
                  fontSize: "12px", fontWeight: "bold", color: "#E87722",
                  fontFamily: "Arial", marginBottom: "4px", textTransform: "uppercase",
                }}>
                  Real World Connection
                </p>
                <p style={{ fontSize: "13px", color: "#2C3E50", fontFamily: "Arial", lineHeight: "1.6" }}>
                  {currentNcl.real_world_connection}
                </p>
              </div>
            )}

            {currentNcl.key_facts && (
              <div>
                <p style={{
                  fontSize: "12px", fontWeight: "bold", color: "#1A5276",
                  fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase",
                }}>
                  Key Facts
                </p>
                {currentNcl.key_facts.map((fact, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ color: "#E87722", fontWeight: "bold", flexShrink: 0 }}>•</span>
                    <p style={{ fontSize: "13px", color: "#2C3E50", fontFamily: "Arial", lineHeight: "1.5" }}>
                      {fact}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentNcl.worked_example && (
            <div className="card" style={{ marginBottom: "16px" }}>
              <p style={{
                fontSize: "12px", fontWeight: "bold", color: "#1A5276",
                fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase",
              }}>
                Worked Example
              </p>
              <p style={{
                fontSize: "14px", color: "#2C3E50", fontFamily: "Arial",
                lineHeight: "1.7", whiteSpace: "pre-line",
              }}>
                {currentNcl.worked_example}
              </p>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={() => setLearningStep("done")}
            style={{ width: "100%", padding: "14px" }}
          >
            I understand — move to next sub-topic →
          </button>
        </div>
      )}

      {/* DONE STEP */}
      {learningStep === "done" && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ fontSize: "40px", marginBottom: "16px" }}>✓</p>
          <h2 style={{
            fontSize: "20px", fontWeight: "bold", color: "#1E8449",
            fontFamily: "Arial", marginBottom: "8px",
          }}>
            {currentNcl.subtopic_name} complete
          </h2>
          <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "32px" }}>
            {currentIndex < totalSubtopics - 1
              ? `Next: ${subtopics[currentIndex + 1]?.label}`
              : "All sub-topics complete — exit ticket next"}
          </p>
          <button
            className="btn-primary"
            onClick={handleSubtopicComplete}
            style={{ padding: "14px 32px" }}
          >
            {currentIndex < totalSubtopics - 1
              ? `Continue to ${subtopics[currentIndex + 1]?.label} →`
              : "Take Exit Ticket →"}
          </button>
        </div>
      )}
    </div>
  )
}
