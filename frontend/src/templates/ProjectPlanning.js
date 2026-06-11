import React, { useState } from "react"
import { useUnit } from "../context/UnitContext"
import TemplateHeader from "../components/TemplateHeader"

export default function ProjectPlanning({ onNavigate }) {
  const { saveStudentProgress, studentProgress, addCompletedTemplate } = useUnit()

  const [projectIdea, setProjectIdea] = useState(
    studentProgress?.project_idea || ""
  )
  const [error, setError] = useState("")

  const handleContinue = () => {
    if (!projectIdea.trim() || projectIdea.trim().length < 10) {
      setError("Please describe your project idea in at least a few words.")
      return
    }
    addCompletedTemplate("projectPlanning")
    saveStudentProgress({
      project_idea        : projectIdea.trim(),
      current_screen      : "rac",
      completed_templates : [
        ...(studentProgress?.completed_templates || []),
        "projectPlanning",
      ],
    })
    onNavigate("rac")
  }

  return (
    <div>
      <TemplateHeader
        template="PROJECT PLANNING"
        subtitle="What will you create?"
      />

      <div className="card" style={{ background: "#1A5276", marginBottom: "20px" }}>
        <p style={{
          color     : "white",
          fontSize  : "16px",
          fontFamily: "Arial",
          lineHeight: "1.6",
        }}>
          You have completed the learning phase.
          Now it is time to apply what you know by building something real.
        </p>
      </div>

      <div className="card">
        <p style={{
          fontWeight  : "bold",
          fontSize    : "16px",
          color       : "#1A5276",
          fontFamily  : "Arial",
          marginBottom: "8px",
        }}>
          What would you like to create?
        </p>
        <p style={{
          fontSize    : "13px",
          color       : "#5D6D7E",
          fontFamily  : "Arial",
          marginBottom: "16px",
          lineHeight  : "1.6",
        }}>
          Describe your project idea. The AI will then suggest a structure for
          you to build it — or you can choose from 3 project suggestions based
          on your learning.
        </p>

        <textarea
          value={projectIdea}
          onChange={e => {
            setProjectIdea(e.target.value)
            setError("")
          }}
          placeholder="e.g. I want to make a data report analysing batting averages using integers..."
          rows={4}
          style={{
            width       : "100%",
            padding     : "12px",
            borderRadius: "8px",
            border      : "1px solid #BDC3C7",
            fontFamily  : "Arial",
            fontSize    : "14px",
            lineHeight  : "1.6",
            resize      : "vertical",
            marginBottom: "8px",
            boxSizing   : "border-box",
          }}
        />

        <p style={{
          fontSize    : "11px",
          color       : projectIdea.trim().length >= 10 ? "#1E8449" : "#BDC3C7",
          fontFamily  : "Arial",
          marginBottom: "16px",
        }}>
          {projectIdea.trim().length >= 10
            ? "✓ Good — click Continue to get AI project suggestions"
            : "Write a brief description of your idea"}
        </p>

        {error && (
          <p style={{
            color       : "#C0392B",
            fontSize    : "13px",
            fontFamily  : "Arial",
            marginBottom: "12px",
          }}>
            {error}
          </p>
        )}

        <button
          className="btn-primary"
          onClick={handleContinue}
          style={{ width: "100%", padding: "14px" }}
        >
          Continue to Project Builder →
        </button>
      </div>
    </div>
  )
}
