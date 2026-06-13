import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import QuizRunner from "../components/QuizRunner"
import TemplateHeader from "../components/TemplateHeader"

// Fallback subtopics when the API fails to return them
const FALLBACK_SUBTOPICS = [
  { key: "core_concepts",   label: "Core Concepts"   },
  { key: "key_rules",       label: "Key Rules"       },
  { key: "applications",    label: "Applications"    },
  { key: "problem_solving", label: "Problem Solving" },
]

export default function MasteryGate({ onNavigate }) {
  const { sessionId, generatedContent, addCompletedTemplate, updatePerformance, saveStudentProgress, studentProgress } = useUnit()

  // Initialisation state
  const [subtopics,            setSubtopics]            = useState([])
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState(null)
  const [masteryReady,         setMasteryReady]         = useState(false)

  // Completion state
  const [masteryDone,    setMasteryDone]    = useState(false)
  const [masteryScore,   setMasteryScore]   = useState(0)
  const [masteryTotal,   setMasteryTotal]   = useState(0)

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    initMastery()
  }, [sessionId]) // eslint-disable-line

  const initMastery = async () => {
    // 1. Get chapter-specific sub-topics — use pre-generated content first
    let dynamicSubs = []
    if (generatedContent?.subtopics?.subtopics?.length) {
      dynamicSubs = generatedContent.subtopics.subtopics
    } else {
      try {
        const res = await api.generateSubtopics(sessionId)
        if (res.subtopics?.length) dynamicSubs = res.subtopics
      } catch (e) {
        console.warn("generateSubtopics failed, using fallback:", e)
      }
    }
    if (!dynamicSubs.length) dynamicSubs = FALLBACK_SUBTOPICS
    setSubtopics(dynamicSubs)

    // 2. Pre-generate all mastery questions
    let pregen = null
    try {
      const result = await api.generateMasteryAll(sessionId)
      if (result.questions) {
        pregen = result.questions
        setPreGeneratedQuestions(pregen)
      }
    } catch (e) {
      console.warn("generateMasteryAll failed:", e)
    }

    setMasteryReady(true)
  }

  const handleContinue = () => {
    const pct        = masteryTotal > 0 ? masteryScore / masteryTotal : 1
    const nextScreen = pct >= 0.5 ? "rac" : "analysis_review"
    addCompletedTemplate("masteryGate")
    saveStudentProgress({
      completed_templates: [
        ...(studentProgress?.completed_templates || []),
        "masteryGate",
      ],
    })
    onNavigate(nextScreen)
  }

  // ── Loading screen while sub-topics + questions generate ──────
  if (!masteryReady) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: "60vh", gap: "24px",
      }}>
        <div style={{
          width: "56px", height: "56px",
          border: "4px solid #F2F3F4",
          borderTop: "4px solid #E87722",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }} />
        <p style={{ fontSize: "16px", color: "#5D6D7E", fontFamily: "Arial" }}>
          Preparing your mastery challenge...
        </p>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  // Weight questions toward weak subtopics from NCL exit ticket
  const weakSubtopics = studentProgress?.weak_subtopics || []

  // Build flat question list — weak subtopics get more questions (3K+2S vs 1K+1S)
  const allMasteryQuestions = subtopics.flatMap(st => {
    const pool      = preGeneratedQuestions?.[st.key] || {}
    const knowledge = (pool.knowledge || []).filter(Boolean)
    const skills    = (pool.skills    || []).filter(Boolean)
    const isWeak    = weakSubtopics.includes(st.key) || weakSubtopics.includes(st.label)
    const kCount    = isWeak ? 3 : 1
    const sCount    = isWeak ? 2 : 1
    return [
      ...knowledge.slice(0, kCount),
      ...skills.slice(0, sCount),
    ].filter(Boolean).map(q => ({
      ...q,
      subtopic: st.key,
      label   : st.label,
      isWeak,
    }))
  })

  return (
    <div>
      <TemplateHeader
        template="MASTERY GATE"
        subtitle={`${allMasteryQuestions.length} questions across all sub-topics`}
      />

      {/* Subtopic pills — amber for weak, blue for strong */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {subtopics.map(st => {
          const isWeak = weakSubtopics.includes(st.key) || weakSubtopics.includes(st.label)
          return (
            <span key={st.key} style={{
              padding   : "4px 12px",
              borderRadius: "16px",
              fontSize  : "12px",
              fontWeight: "bold",
              fontFamily: "Arial",
              background: isWeak ? "#FADBD8" : "#EBF5FB",
              color     : isWeak ? "#C0392B" : "#1A5276",
            }}>
              {isWeak ? "⚠ " : ""}{st.label}
            </span>
          )
        })}
      </div>

      {/* Quiz */}
      <QuizRunner
        questions={allMasteryQuestions}
        subtopic="mastery"
        title="Mastery Gate"
        subtitle={`${allMasteryQuestions.length} questions across all sub-topics`}
        onComplete={(score, results, analysis) => {
          const total  = allMasteryQuestions.length
          const colour = score >= total * 0.8 ? "green"
                       : score >= total * 0.5 ? "amber"
                       : "red"
          const nextScreen = score / total >= 0.5 ? "projectPlanning" : "analysis_review"
          setMasteryScore(score)
          setMasteryTotal(total)
          setMasteryDone(true)
          updatePerformance("masteryGateResult", `${score}/${total} — ${colour}`)
          saveStudentProgress({
            mastery_gate_result     : `${score}/${total} — ${colour}`,
            current_screen          : nextScreen,
            mastery_weak_subtopics  : analysis?.weakSubtopics  || [],
            mastery_wrong_questions : analysis?.wrongQuestions  || [],
          })
        }}
      />

      {/* Continue button — appears once quiz is done */}
      {masteryDone && (
        <button
          className="btn-primary"
          onClick={handleContinue}
          style={{ width: "100%", padding: "14px", marginTop: "20px" }}
        >
          {masteryTotal > 0 && masteryScore / masteryTotal >= 0.5
            ? "Continue to Project Planning →"
            : "Review Concepts →"}
        </button>
      )}
    </div>
  )
}
