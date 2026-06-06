import React, { useEffect, useState } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"

export default function Analysis({ onNavigate }) {
  const { sessionId, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  // step: "organiser" | "checking" | "results" | "synthesis"
  const [step,    setStep]    = useState("organiser")

  // Graphic organiser inputs
  const [observations, setObservations] = useState(["", "", ""])
  const [patterns,     setPatterns]     = useState("")
  const [surprises,    setSurprises]    = useState("")
  const [conclusion,   setConclusion]   = useState("")

  // Batch check result
  const [analysisResult, setAnalysisResult] = useState(null)

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  useEffect(() => {
    if (!sessionId) { onNavigate("teacherInput"); return }
    api.generateAnalysis(sessionId)
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId]) // eslint-disable-line

  const updateObservation = (i, value) =>
    setObservations(prev => prev.map((v, idx) => idx === i ? value : v))

  const hasContent =
    observations.some(o => o.trim().length >= 10) ||
    patterns.trim().length >= 10 ||
    surprises.trim().length >= 10 ||
    conclusion.trim().length >= 10

  const submitAnalysis = async () => {
    setStep("checking")
    try {
      const result = await api.checkAnalysis(sessionId, {
        observations: observations.filter(o => o.trim()).join(" | "),
        patterns,
        surprises,
        conclusion,
      })
      setAnalysisResult(result)
    } catch (e) {
      // Fallback — skip AI feedback, go straight to results
      setAnalysisResult(null)
    }
    setStep("results")
  }

  const handleContinue = () => {
    addCompletedTemplate("analysis")
    saveStudentProgress({ current_screen: "discussion" })
    onNavigate("discussion")
  }

  if (loading) return <SimpleLoader />
  if (!data)   return <p style={{ fontFamily: "Arial", color: "#C0392B" }}>Failed to load Analysis.</p>

  // ── CHECKING ───────────────────────────────────────────────────
  if (step === "checking") return <SimpleLoader />

  // ── RESULTS ────────────────────────────────────────────────────
  if (step === "results") return (
    <div>
      <TemplateHeader template="ANALYSIS" subtitle="Your Results" />

      {/* Your analysis — blue */}
      <div style={{
        background: "#EBF5FB", border: "2px solid #2E86C1",
        borderRadius: "12px", padding: "20px", marginBottom: "16px",
      }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#1A5276",
                     fontWeight: "bold", fontFamily: "Arial", marginBottom: "10px" }}>
          YOUR ANALYSIS
        </p>

        {analysisResult?.student_analysis_feedback && (
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#1A5276",
                       lineHeight: "1.7", marginBottom: "12px" }}>
            {analysisResult.student_analysis_feedback}
          </p>
        )}

        {/* Student's own responses */}
        {observations.some(o => o.trim()) && (
          <div style={{ marginBottom: "8px" }}>
            <p style={{ fontFamily: "Arial", fontSize: "12px", color: "#5D6D7E",
                         fontWeight: "bold", marginBottom: "4px" }}>What I noticed:</p>
            {observations.filter(o => o.trim()).map((o, i) => (
              <p key={i} style={{ fontFamily: "Arial", fontSize: "13px",
                                   color: "#2C3E50", marginBottom: "2px" }}>• {o}</p>
            ))}
          </div>
        )}
        {patterns.trim() && (
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50", marginBottom: "4px" }}>
            <strong>Patterns:</strong> {patterns}
          </p>
        )}
        {surprises.trim() && (
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50", marginBottom: "4px" }}>
            <strong>What surprised me:</strong> {surprises}
          </p>
        )}
        {conclusion.trim() && (
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#2C3E50" }}>
            <strong>My conclusion:</strong> {conclusion}
          </p>
        )}
      </div>

      {/* Missed insight — amber callout */}
      {analysisResult?.missed_insight && (
        <div style={{
          background: "#FEF9E7", border: "1px solid #F9E79F",
          borderRadius: "10px", padding: "14px", marginBottom: "16px",
        }}>
          <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#7D6608" }}>
            💡 <strong>One thing to consider:</strong> {analysisResult.missed_insight}
          </p>
        </div>
      )}

      {/* Ideal analysis — green */}
      <div style={{
        background: "#EAFAF1", border: "2px solid #1E8449",
        borderRadius: "12px", padding: "20px", marginBottom: "20px",
      }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#1E8449",
                     fontWeight: "bold", fontFamily: "Arial", marginBottom: "10px" }}>
          IDEAL ANALYSIS
        </p>
        {analysisResult?.ideal_analysis ? (
          <>
            <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#1E8449",
                         lineHeight: "1.7", marginBottom: "10px" }}>
              {analysisResult.ideal_analysis}
            </p>
            {analysisResult.connection_to_chapter && (
              <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#1E8449",
                           fontStyle: "italic" }}>
                🔗 {analysisResult.connection_to_chapter}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontFamily: "Arial", fontSize: "14px", color: "#1E8449", lineHeight: "1.7" }}>
            {data.class_model}
          </p>
        )}
      </div>

      <button
        className="btn-primary"
        onClick={() => setStep("synthesis")}
        style={{ width: "100%", padding: "14px" }}
      >
        Continue to Class Synthesis →
      </button>
    </div>
  )

  // ── SYNTHESIS ──────────────────────────────────────────────────
  if (step === "synthesis") return (
    <div>
      <TemplateHeader template="ANALYSIS" subtitle="Class Synthesis" />

      <div className="dark-card" style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "8px" }}>
          WHAT THE CLASS DISCOVERED
        </p>
        <p style={{ color: "white", fontFamily: "Arial", fontSize: "15px", lineHeight: "1.7" }}>
          {data.class_model}
        </p>
      </div>

      {data.reflection_prompts && (
        <div className="card" style={{ background: "#FEF9E7", border: "1px solid #F9E79F", marginBottom: "16px" }}>
          <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "13px", color: "#7D6608", marginBottom: "8px" }}>
            Reflect further
          </p>
          {data.reflection_prompts.map((p, i) => (
            <p key={i} style={{ fontFamily: "Arial", fontSize: "13px", color: "#7D6608", marginBottom: "6px" }}>
              {i + 1}. {p}
            </p>
          ))}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleContinue}
        style={{ width: "100%", padding: "14px" }}
      >
        Continue to Discussion →
      </button>
    </div>
  )

  // ── GRAPHIC ORGANISER (default / "organiser" step) ─────────────
  return (
    <div>
      <TemplateHeader template="ANALYSIS" subtitle="Shepherd" />

      {/* Artifact */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h2 className="heading-2" style={{ marginBottom: "4px" }}>{data.artifact_title}</h2>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "16px" }}>
          {data.artifact_description}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.data && data.data.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: "8px",
              background: i % 2 === 0 ? "#F8F9FA" : "white",
              border: "1px solid #E5E7E9"
            }}>
              <span style={{ fontFamily: "Arial", fontSize: "14px", color: "#2C3E50" }}>{row.label}</span>
              <span style={{ fontFamily: "Arial", fontSize: "14px", fontWeight: "bold", color: "#1A5276" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graphic organiser — Section 1: What I Notice (3 observations) */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px",
                     color: "#1A5276", marginBottom: "4px" }}>
          🔍 What I Notice
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "12px" }}>
          {data.guiding_questions?.[0]}
        </p>
        {[0, 1, 2].map(i => (
          <textarea
            key={i}
            value={observations[i]}
            onChange={e => updateObservation(i, e.target.value)}
            placeholder={`Observation ${i + 1}...`}
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px",
              borderRadius: "8px", border: "1px solid #BDC3C7",
              fontFamily: "Arial", fontSize: "14px", resize: "vertical",
              marginBottom: i < 2 ? "8px" : "0"
            }}
          />
        ))}
      </div>

      {/* Section 2: Patterns */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px",
                     color: "#1A5276", marginBottom: "4px" }}>
          📊 Patterns I Can See
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "12px" }}>
          {data.guiding_questions?.[1]}
        </p>
        <textarea
          value={patterns}
          onChange={e => setPatterns(e.target.value)}
          placeholder="Write the patterns you notice..."
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px",
            borderRadius: "8px", border: "1px solid #BDC3C7",
            fontFamily: "Arial", fontSize: "14px", resize: "vertical"
          }}
        />
      </div>

      {/* Section 3: What Surprises Me */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px",
                     color: "#1A5276", marginBottom: "4px" }}>
          😮 What Surprises Me
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "12px" }}>
          {data.guiding_questions?.[2]}
        </p>
        <textarea
          value={surprises}
          onChange={e => setSurprises(e.target.value)}
          placeholder="What surprised you most?"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px",
            borderRadius: "8px", border: "1px solid #BDC3C7",
            fontFamily: "Arial", fontSize: "14px", resize: "vertical"
          }}
        />
      </div>

      {/* Section 4: My Conclusion */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px",
                     color: "#1A5276", marginBottom: "4px" }}>
          💡 My Conclusion
        </p>
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E", marginBottom: "12px" }}>
          {data.guiding_questions?.[3]}
        </p>
        <textarea
          value={conclusion}
          onChange={e => setConclusion(e.target.value)}
          placeholder="What can you conclude from this data?"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px",
            borderRadius: "8px", border: "1px solid #BDC3C7",
            fontFamily: "Arial", fontSize: "14px", resize: "vertical"
          }}
        />
      </div>

      {!hasContent && (
        <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#95A5A6",
                     textAlign: "center", marginBottom: "8px" }}>
          Fill in at least one section to submit your analysis.
        </p>
      )}

      <button
        onClick={submitAnalysis}
        disabled={!hasContent}
        style={{
          width: "100%", padding: "14px",
          background: hasContent ? "#E87722" : "#BDC3C7",
          color: "white", border: "none", borderRadius: "8px",
          cursor: hasContent ? "pointer" : "not-allowed",
          fontFamily: "Arial", fontSize: "15px", fontWeight: "bold",
        }}
      >
        Submit My Analysis →
      </button>
    </div>
  )
}
