import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import TemplateHeader from "../components/TemplateHeader"

const STEPS = [
  { id: "research",  label: "Research",           icon: "🔍", desc: "Gather information and evidence related to your project idea." },
  { id: "organise",  label: "Organise",            icon: "📋", desc: "Arrange your findings into a logical structure." },
  { id: "create",    label: "Create Your Artifact",icon: "🎨", desc: "Build your artifact — poster, model, report, or presentation." },
  { id: "present",   label: "Present",             icon: "🎤", desc: "Share your work and explain your thinking." },
]

export default function RAC({ onNavigate }) {
  const { performance, addCompletedTemplate, saveStudentProgress } = useUnit()
  const [completedSteps, setCompletedSteps] = useState([])
  const [notes, setNotes] = useState({})
  const [activeStep, setActiveStep] = useState("research")

  const toggleStep = (id) => {
    setCompletedSteps(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleContinue = () => {
    addCompletedTemplate("rac")
    saveStudentProgress({ current_screen: "reflection" })
    onNavigate("reflection")
  }

  return (
    <div>
      <TemplateHeader template="RESEARCH & ARTIFACT CREATION" subtitle="Facilitator" />

      <div className="dark-card" style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#E87722", marginBottom: "6px" }}>YOUR PROJECT</p>
        <p style={{ color: "white", fontFamily: "Arial", fontSize: "16px", fontWeight: "500" }}>
          {performance.projectIdea || "Your project (set in Project Planning)"}
        </p>
      </div>

      {/* Step tracker */}
      {STEPS.map((step, i) => (
        <div key={step.id} className="card" style={{
          borderLeft: `4px solid ${completedSteps.includes(step.id) ? "#1E8449" : activeStep === step.id ? "#E87722" : "#BDC3C7"}`,
          marginBottom: "12px", cursor: "pointer"
        }}
          onClick={() => setActiveStep(step.id)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ fontSize: "20px" }}>{step.icon}</span>
              <div>
                <p style={{ fontFamily: "Arial", fontWeight: "bold", fontSize: "14px", color: "#1A5276" }}>
                  {i + 1}. {step.label}
                </p>
                <p style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E" }}>{step.desc}</p>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); toggleStep(step.id) }}
              style={{
                background: completedSteps.includes(step.id) ? "#1E8449" : "#F2F3F4",
                color: completedSteps.includes(step.id) ? "white" : "#5D6D7E",
                border: "none", borderRadius: "20px", padding: "4px 12px",
                fontSize: "12px", cursor: "pointer", fontFamily: "Arial",
                whiteSpace: "nowrap"
              }}
            >
              {completedSteps.includes(step.id) ? "✓ Done" : "Mark done"}
            </button>
          </div>

          {activeStep === step.id && (
            <textarea
              value={notes[step.id] || ""}
              onChange={e => setNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
              placeholder={`Notes for ${step.label}...`}
              rows={3}
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", marginTop: "12px", padding: "10px",
                borderRadius: "8px", border: "1px solid #BDC3C7",
                fontFamily: "Arial", fontSize: "14px", resize: "vertical"
              }}
            />
          )}
        </div>
      ))}

      <div style={{
        background: "#F8F9FA", borderRadius: "8px", padding: "12px",
        display: "flex", justifyContent: "space-between", marginBottom: "16px"
      }}>
        <span style={{ fontFamily: "Arial", fontSize: "13px", color: "#5D6D7E" }}>Progress</span>
        <span style={{ fontFamily: "Arial", fontSize: "13px", fontWeight: "bold", color: "#1A5276" }}>
          {completedSteps.length} / {STEPS.length} steps complete
        </span>
      </div>

      <button className="btn-primary" onClick={handleContinue}
        style={{ width: "100%", padding: "14px" }}>
        Continue to Reflection →
      </button>
    </div>
  )
}
