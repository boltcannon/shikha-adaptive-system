import React from "react"

/**
 * Reusable AI feedback panel for open-ended text responses.
 *
 * Props:
 *   onCheck       – async handler that calls api.checkOpenEnded and sets feedback
 *   checking      – boolean, true while the API call is in flight
 *   feedback      – result object { quality, feedback, follow_up, encourage_more }
 *   disabled      – disable the button (e.g. when textarea is empty)
 *   buttonLabel   – button text (default "Get AI Feedback")
 */
export default function OpenEndedFeedback({
  onCheck,
  checking,
  feedback,
  disabled,
  buttonLabel = "Get AI Feedback"
}) {
  const isDisabled = checking || disabled

  return (
    <div style={{ marginTop: "8px" }}>
      <button
        onClick={onCheck}
        disabled={isDisabled}
        style={{
          background: isDisabled ? "#BDC3C7" : "#E87722",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          cursor: isDisabled ? "not-allowed" : "pointer",
          fontFamily: "Arial",
          fontSize: "13px",
          transition: "background 0.2s"
        }}
      >
        {checking ? "Checking..." : buttonLabel}
      </button>

      {feedback && (
        <div style={{
          background: "#EBF5FB",
          border: "1px solid #AED6F1",
          borderRadius: "8px",
          padding: "12px",
          marginTop: "8px"
        }}>
          <p style={{
            fontSize: "13px",
            color: "#1A5276",
            fontFamily: "Arial",
            lineHeight: "1.6",
            marginBottom: feedback.follow_up ? "6px" : "0"
          }}>
            {feedback.feedback}
          </p>
          {feedback.follow_up && (
            <p style={{
              fontSize: "12px",
              color: "#5D6D7E",
              fontFamily: "Arial",
              fontStyle: "italic",
              lineHeight: "1.5"
            }}>
              💭 {feedback.follow_up}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
