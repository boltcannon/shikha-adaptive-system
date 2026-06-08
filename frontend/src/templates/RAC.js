import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"
import TemplateHeader from "../components/TemplateHeader"
import { exportReportAsPDF } from "../utils/exportPDF"

const SECTION_KEYS = ["introduction", "findings", "analysis", "recommendations"]

const DIFFICULTY_STYLE = {
  easy  : { background: "#D5F5E3", color: "#1E8449" },
  medium: { background: "#FEF9E7", color: "#B7950B" },
  hard  : { background: "#FADBD8", color: "#C0392B" },
}

export default function RAC({ onNavigate }) {
  const {
    sessionId,
    saveStudentProgress,
    studentProgress,
    studentName,
    unitInput,
  } = useUnit()

  // project_idea is populated either from prior studentProgress
  // or set freshly when the student picks a suggestion
  const [resolvedIdea, setResolvedIdea] = useState(
    studentProgress?.project_idea || ""
  )

  // ── Suggestions state ──────────────────────────────────
  const [suggestions, setSuggestions]         = useState(null)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(null)
  const [customIdea, setCustomIdea]           = useState("")
  const [showCustom, setShowCustom]           = useState(false)

  // ── Phase state ────────────────────────────────────────
  // Skip suggestions if we already have a saved project_idea
  const [phase, setPhase] = useState(
    studentProgress?.project_idea ? "setup" : "suggestions"
  )

  // ── Report-builder state ───────────────────────────────
  const [template, setTemplate]               = useState(null)
  const [currentSection, setCurrentSection]   = useState(0)
  const [sectionContent, setSectionContent]   = useState({
    introduction   : "",
    findings       : "",
    analysis       : "",
    recommendations: "",
  })
  const [feedback, setFeedback]               = useState({})
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const [readySections, setReadySections]     = useState({})
  const [generating, setGenerating]           = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [artifact,     setArtifact]     = useState(null)
  const [downloading,  setDownloading]  = useState(false)
  const [error,        setError]        = useState("")

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      await exportReportAsPDF(artifact, studentName, unitInput)
    } catch (e) {
      console.error("PDF export failed:", e)
    }
    setDownloading(false)
  }

  // Scroll to top on phase / section change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [phase, currentSection])

  // Load suggestions on mount (only in suggestions phase)
  useEffect(() => {
    if (phase === "suggestions") {
      loadSuggestions()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadSuggestions = async () => {
    setLoadingSuggestions(true)
    try {
      const result = await api.getRacSuggestions(sessionId)
      if (result.suggestions) setSuggestions(result.suggestions)
    } catch (e) {
      console.log("Could not load suggestions:", e)
    }
    setLoadingSuggestions(false)
  }

  // ── Confirm project choice and move to setup ───────────
  const handleUseProject = () => {
    let idea = ""
    if (showCustom && customIdea.trim()) {
      idea = customIdea.trim()
    } else if (selectedSuggestion !== null && suggestions) {
      const s = suggestions[selectedSuggestion]
      idea = `${s.title}: ${s.description}`
    }
    if (!idea) {
      setError("Please select a project or write your own idea.")
      return
    }
    setResolvedIdea(idea)
    saveStudentProgress({ project_idea: idea })
    setError("")
    setPhase("setup")
  }

  // ── Generate report template ───────────────────────────
  const generateTemplate = async () => {
    if (!resolvedIdea.trim()) {
      setError("No project idea found. Please go back and pick one.")
      return
    }
    setGenerating(true)
    setError("")
    try {
      const result = await api.generateRacTemplate(sessionId, resolvedIdea)
      if (result.report_title) {
        setTemplate(result)
        setPhase("writing")
      } else {
        setError("Could not generate template. Try again.")
      }
    } catch (e) {
      setError("Connection failed. Is the backend running?")
    }
    setGenerating(false)
  }

  // ── Per-section AI feedback ────────────────────────────
  const handleGetFeedback = async () => {
    const sectionKey = SECTION_KEYS[currentSection]
    const section    = template[sectionKey]
    const content    = sectionContent[sectionKey]
    if (!content.trim()) {
      setError("Please write something before checking.")
      return
    }
    setLoadingFeedback(true)
    setError("")
    try {
      const result = await api.checkRacSection(
        sessionId, resolvedIdea,
        section.title, section.guiding_question, content
      )
      setFeedback(prev => ({ ...prev, [sectionKey]: result }))
      if (result.ready) {
        setReadySections(prev => ({ ...prev, [sectionKey]: true }))
      }
    } catch (e) {
      setError("Could not get feedback. Try again.")
    }
    setLoadingFeedback(false)
  }

  const handleNextSection = () => {
    if (currentSection < SECTION_KEYS.length - 1) {
      setCurrentSection(currentSection + 1)
      setError("")
    } else {
      handleBuildArtifact()
    }
  }

  // ── Compile + save artifact ────────────────────────────
  const handleBuildArtifact = async () => {
    setSaving(true)
    const sections = SECTION_KEYS.map(key => ({
      key    : key,
      title  : template[key].title,
      content: sectionContent[key],
    }))
    try {
      await api.saveRacArtifact(
        sessionId, resolvedIdea, template.report_title, sections
      )
    } catch (e) {
      console.log("Could not save artifact:", e)
    }
    setArtifact({ report_title: template.report_title, project_idea: resolvedIdea, sections })
    setPhase("artifact")
    saveStudentProgress({
      current_screen     : "reflection",
      completed_templates: [
        ...(studentProgress?.completed_templates || []),
        "rac",
      ],
    })
    setSaving(false)
  }

  // ══════════════════════════════════════════════════════
  // PHASE: suggestions
  // ══════════════════════════════════════════════════════
  if (phase === "suggestions") {
    return (
      <div>
        <TemplateHeader
          template="RESEARCH AND ARTIFACT CREATION"
          subtitle="Choose Your Project"
        />

        <div className="card" style={{ marginBottom: "20px" }}>
          <p style={{ fontWeight: "bold", fontSize: "16px", color: "#1A5276", fontFamily: "Arial", marginBottom: "8px" }}>
            Based on your learning journey, here are 3 project ideas for you
          </p>
          <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
            Pick one or write your own idea below.
          </p>
        </div>

        {loadingSuggestions && <SimpleLoader />}

        {suggestions && suggestions.map((s, i) => (
          <div
            key={i}
            onClick={() => { setSelectedSuggestion(i); setShowCustom(false); setError("") }}
            style={{
              background  : selectedSuggestion === i ? "#EBF5FB" : "white",
              border      : `2px solid ${selectedSuggestion === i ? "#1A5276" : "#F2F3F4"}`,
              borderRadius: "12px",
              padding     : "16px",
              marginBottom: "12px",
              cursor      : "pointer",
              transition  : "all 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <p style={{ fontWeight: "bold", fontSize: "15px", color: "#1A5276", fontFamily: "Arial" }}>
                {s.title}
              </p>
              <span style={{
                ...(DIFFICULTY_STYLE[s.difficulty] || DIFFICULTY_STYLE.medium),
                fontSize: "11px", fontWeight: "bold", fontFamily: "Arial",
                padding: "2px 8px", borderRadius: "10px", flexShrink: 0, marginLeft: "8px",
              }}>
                {s.difficulty}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#2C3E50", fontFamily: "Arial", lineHeight: "1.6", marginBottom: "8px" }}>
              {s.description}
            </p>
            <p style={{ fontSize: "12px", color: "#E87722", fontFamily: "Arial", fontStyle: "italic", marginBottom: "8px" }}>
              Why this suits you: {s.why_good}
            </p>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {s.concepts.map(c => (
                <span key={c} style={{
                  background: "#F2F3F4", borderRadius: "10px", padding: "2px 8px",
                  fontSize: "11px", color: "#1A5276", fontFamily: "Arial", fontWeight: "bold",
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Custom idea */}
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={() => { setShowCustom(!showCustom); setSelectedSuggestion(null); setError("") }}
            style={{
              background  : showCustom ? "#EBF5FB" : "white",
              border      : `2px solid ${showCustom ? "#1A5276" : "#BDC3C7"}`,
              borderRadius: "12px",
              padding     : "12px 16px",
              cursor      : "pointer",
              fontFamily  : "Arial",
              fontSize    : "14px",
              color       : "#1A5276",
              width       : "100%",
              textAlign   : "left",
            }}
          >
            ✏️ I have my own idea
          </button>

          {showCustom && (
            <textarea
              value={customIdea}
              onChange={e => setCustomIdea(e.target.value)}
              placeholder="Describe your project idea..."
              rows={3}
              style={{
                width: "100%", padding: "10px", borderRadius: "8px",
                border: "1px solid #BDC3C7", fontFamily: "Arial",
                fontSize: "14px", marginTop: "8px",
              }}
            />
          )}
        </div>

        {error && (
          <p style={{ color: "#C0392B", fontSize: "13px", fontFamily: "Arial", marginBottom: "12px" }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary"
          onClick={handleUseProject}
          disabled={selectedSuggestion === null && (!showCustom || !customIdea.trim())}
          style={{ width: "100%", padding: "14px" }}
        >
          Use This Project →
        </button>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // PHASE: setup
  // ══════════════════════════════════════════════════════
  if (phase === "setup") {
    return (
      <div>
        <TemplateHeader
          template="RESEARCH AND ARTIFACT CREATION"
          subtitle="Data Report Builder"
        />

        <div className="card" style={{ background: "#1A5276", marginBottom: "20px" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontFamily: "Arial", marginBottom: "4px" }}>
            Your project
          </p>
          <p style={{ color: "white", fontSize: "18px", fontWeight: "bold", fontFamily: "Arial" }}>
            {resolvedIdea || "No project idea found"}
          </p>
          <button
            onClick={() => { setPhase("suggestions"); setError("") }}
            style={{
              marginTop: "10px", background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
              color: "white", fontFamily: "Arial", fontSize: "12px",
              padding: "4px 10px", cursor: "pointer",
            }}
          >
            ← Change project
          </button>
        </div>

        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{ fontWeight: "bold", fontSize: "16px", color: "#1A5276", fontFamily: "Arial", marginBottom: "8px" }}>
            Build Your Data Report
          </p>
          <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial", lineHeight: "1.6", marginBottom: "16px" }}>
            You will write a structured Data Report with 4 sections. The AI will generate
            a template based on your project idea and guide you through each section.
          </p>

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            {["Introduction", "Findings", "Analysis", "Recommendations"].map((s, i) => (
              <div key={s} style={{
                background: "#F2F3F4", borderRadius: "8px", padding: "8px 12px",
                fontSize: "13px", fontFamily: "Arial", color: "#1A5276", fontWeight: "bold",
              }}>
                {i + 1}. {s}
              </div>
            ))}
          </div>

          {error && (
            <p style={{ color: "#C0392B", fontSize: "13px", fontFamily: "Arial", marginBottom: "12px" }}>
              {error}
            </p>
          )}

          <button
            className="btn-primary"
            onClick={generateTemplate}
            disabled={generating}
            style={{ width: "100%", padding: "14px" }}
          >
            {generating ? "Generating your template..." : "Generate My Report Template →"}
          </button>
        </div>

        {generating && <SimpleLoader />}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // PHASE: writing
  // ══════════════════════════════════════════════════════
  if (phase === "writing" && template) {
    const sectionKey = SECTION_KEYS[currentSection]
    const section    = template[sectionKey]
    const content    = sectionContent[sectionKey]
    const fb         = feedback[sectionKey]
    const isReady    = readySections[sectionKey]
    const isLast     = currentSection === SECTION_KEYS.length - 1
    const wordCount  = content.trim().split(/\s+/).filter(Boolean).length

    return (
      <div>
        <TemplateHeader
          template="RESEARCH AND ARTIFACT CREATION"
          subtitle={template.report_title}
        />

        {/* Section progress pills */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {SECTION_KEYS.map((key, i) => (
            <button
              key={key}
              onClick={() => { setCurrentSection(i); setError("") }}
              style={{
                padding: "6px 12px", borderRadius: "16px",
                fontSize: "12px", fontWeight: "bold", fontFamily: "Arial",
                border: "none", cursor: "pointer",
                background: readySections[key] ? "#D5F5E3"
                  : i === currentSection ? "#FEF9E7"
                  : "#F2F3F4",
                color: readySections[key] ? "#1E8449"
                  : i === currentSection ? "#E87722"
                  : "#BDC3C7",
              }}
            >
              {readySections[key] ? "✓ " : ""}{template[key].title}
            </button>
          ))}
        </div>

        {/* Section card */}
        <div className="card" style={{ marginBottom: "16px" }}>
          <p style={{
            fontSize: "12px", color: "#E87722", fontFamily: "Arial",
            fontWeight: "bold", marginBottom: "4px", textTransform: "uppercase",
          }}>
            Section {currentSection + 1} of 4
          </p>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#1A5276", fontFamily: "Arial", marginBottom: "8px" }}>
            {section.title}
          </h2>
          <p style={{ fontSize: "14px", color: "#5D6D7E", fontFamily: "Arial", fontStyle: "italic", marginBottom: "16px" }}>
            {section.guiding_question}
          </p>

          {/* Thinking prompts */}
          <div style={{ background: "#EBF5FB", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
            <p style={{
              fontSize: "11px", fontWeight: "bold", color: "#1A5276",
              fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase",
            }}>
              Think about:
            </p>
            {section.prompts.map((prompt, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                <span style={{ color: "#E87722", fontWeight: "bold", flexShrink: 0 }}>→</span>
                <p style={{ fontSize: "13px", color: "#2C3E50", fontFamily: "Arial" }}>{prompt}</p>
              </div>
            ))}
          </div>

          {/* Collapsible example */}
          <details style={{ marginBottom: "16px" }}>
            <summary style={{
              fontSize: "13px", color: "#1A5276", fontFamily: "Arial",
              cursor: "pointer", fontWeight: "bold",
            }}>
              See an example
            </summary>
            <div style={{
              background: "#F9F9F9", borderRadius: "6px", padding: "10px",
              marginTop: "8px", borderLeft: "3px solid #E87722",
            }}>
              <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial", fontStyle: "italic", lineHeight: "1.6" }}>
                {section.example}
              </p>
            </div>
          </details>

          {/* Writing area */}
          <textarea
            value={content}
            onChange={e => {
              setSectionContent(prev => ({ ...prev, [sectionKey]: e.target.value }))
              if (feedback[sectionKey]) {
                setFeedback(prev => ({ ...prev, [sectionKey]: null }))
                setReadySections(prev => ({ ...prev, [sectionKey]: false }))
              }
            }}
            placeholder={`Write your ${section.title.toLowerCase()} here...`}
            rows={6}
            style={{
              width: "100%", padding: "12px", borderRadius: "8px",
              border: `2px solid ${isReady ? "#1E8449" : fb ? "#E87722" : "#BDC3C7"}`,
              fontFamily: "Arial", fontSize: "14px", lineHeight: "1.6", resize: "vertical",
            }}
          />

          <p style={{
            fontSize: "11px",
            color: wordCount >= 20 ? "#1E8449" : "#BDC3C7",
            fontFamily: "Arial", textAlign: "right", marginTop: "4px",
          }}>
            {wordCount} words{wordCount >= 20 ? " ✓" : " (aim for 20+ words)"}
          </p>
        </div>

        {/* AI Feedback */}
        {fb && (
          <div style={{
            background: fb.ready ? "#D5F5E3" : fb.quality === "good" ? "#EBF5FB" : "#FEF9E7",
            border: `1px solid ${fb.ready ? "#1E8449" : fb.quality === "good" ? "#1A5276" : "#B7950B"}`,
            borderRadius: "10px", padding: "16px", marginBottom: "16px",
          }}>
            <p style={{
              fontWeight: "bold", fontSize: "13px",
              color: fb.ready ? "#1E8449" : "#1A5276",
              fontFamily: "Arial", marginBottom: "6px",
            }}>
              {fb.ready ? "✓ Great work!" : "AI Feedback"}
            </p>
            <p style={{ fontSize: "14px", color: "#2C3E50", fontFamily: "Arial", lineHeight: "1.6", marginBottom: fb.question ? "8px" : "0" }}>
              {fb.feedback}
            </p>
            {fb.question && (
              <p style={{ fontSize: "13px", color: "#1A5276", fontFamily: "Arial", fontStyle: "italic" }}>
                {fb.question}
              </p>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: "#C0392B", fontSize: "13px", fontFamily: "Arial", marginBottom: "12px" }}>
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          {!isReady && (
            <button
              onClick={handleGetFeedback}
              disabled={loadingFeedback || !content.trim()}
              style={{
                flex: 1, padding: "12px",
                background: content.trim() ? "#E87722" : "#BDC3C7",
                color: "white", border: "none", borderRadius: "8px",
                cursor: content.trim() ? "pointer" : "not-allowed",
                fontFamily: "Arial", fontSize: "14px",
              }}
            >
              {loadingFeedback ? "Checking..." : "Get AI Feedback"}
            </button>
          )}

          {(isReady || fb) && (
            <button
              onClick={handleNextSection}
              disabled={saving}
              style={{
                flex: 1, padding: "12px", background: "#1A5276",
                color: "white", border: "none", borderRadius: "8px",
                cursor: "pointer", fontFamily: "Arial", fontSize: "14px", fontWeight: "bold",
              }}
            >
              {saving ? "Building report..."
                : isLast
                ? "Build My Report →"
                : `Next: ${template[SECTION_KEYS[currentSection + 1]]?.title} →`}
            </button>
          )}
        </div>

        {saving && <SimpleLoader />}
      </div>
    )
  }

  // ══════════════════════════════════════════════════════
  // PHASE: artifact
  // ══════════════════════════════════════════════════════
  if (phase === "artifact" && artifact) {
    return (
      <div>
        <TemplateHeader
          template="RESEARCH AND ARTIFACT CREATION"
          subtitle="Your Data Report"
        />

        <div style={{
          background: "white", borderRadius: "12px",
          border: "2px solid #1A5276", overflow: "hidden", marginBottom: "24px",
        }}>
          <div style={{ background: "#1A5276", padding: "24px" }}>
            <p style={{
              color: "#E87722", fontSize: "11px", fontFamily: "Arial",
              fontWeight: "bold", marginBottom: "4px",
              textTransform: "uppercase", letterSpacing: "1px",
            }}>
              Data Report
            </p>
            <h2 style={{ color: "white", fontSize: "22px", fontWeight: "bold", fontFamily: "Arial" }}>
              {artifact.report_title}
            </h2>
          </div>

          {artifact.sections.map((section, i) => (
            <div key={section.key} style={{
              padding: "20px 24px",
              borderBottom: i < artifact.sections.length - 1 ? "1px solid #F2F3F4" : "none",
            }}>
              <p style={{
                fontSize: "11px", fontWeight: "bold", color: "#E87722",
                fontFamily: "Arial", marginBottom: "6px",
                textTransform: "uppercase", letterSpacing: "0.5px",
              }}>
                {i + 1}. {section.title}
              </p>
              <p style={{
                fontSize: "14px", color: "#2C3E50", fontFamily: "Arial",
                lineHeight: "1.7", whiteSpace: "pre-wrap",
              }}>
                {section.content || "(This section was left blank)"}
              </p>
            </div>
          ))}
        </div>

        <div style={{
          background: "#D5F5E3", border: "1px solid #1E8449",
          borderRadius: "10px", padding: "16px", textAlign: "center", marginBottom: "16px",
        }}>
          <p style={{ color: "#1E8449", fontWeight: "bold", fontFamily: "Arial", fontSize: "14px" }}>
            ✓ Your report has been saved
          </p>
          <p style={{ color: "#5D6D7E", fontFamily: "Arial", fontSize: "13px", marginTop: "4px" }}>
            Your teacher can see your completed report.
          </p>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          style={{
            width          : "100%",
            padding        : "14px",
            background     : downloading ? "#BDC3C7" : "white",
            color          : downloading ? "white"   : "#1A5276",
            border         : "2px solid #1A5276",
            borderRadius   : "8px",
            cursor         : downloading ? "not-allowed" : "pointer",
            fontFamily     : "Arial",
            fontSize       : "14px",
            fontWeight     : "bold",
            marginBottom   : "10px",
            display        : "flex",
            alignItems     : "center",
            justifyContent : "center",
            gap            : "8px",
          }}
        >
          {downloading ? "Generating PDF…" : "⬇ Download Report as PDF"}
        </button>

        <button
          className="btn-primary"
          onClick={() => onNavigate("reflection")}
          style={{ width: "100%", padding: "14px" }}
        >
          Continue to Reflection →
        </button>
      </div>
    )
  }

  return <SimpleLoader />
}
