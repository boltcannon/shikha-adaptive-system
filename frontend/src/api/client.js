const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"

export const api = {

  createUnit: async (unitInput) => {
    const r = await fetch(`${BASE_URL}/unit/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(unitInput)
    })
    return r.json()
  },

  generateAll: async (sessionId) => {
    const r = await fetch(`${BASE_URL}/unit/generate-all/${sessionId}`, {
      method: "POST"
    })
    return r.json()
  },

  generateProvocation: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/provocation/${sessionId}`,
      { method: "POST" }
    )
    return r.json()
  },

  generateNCL: async (sessionId, subtopic) => {
    const r = await fetch(
      `${BASE_URL}/generate/ncl/${sessionId}?subtopic=${encodeURIComponent(subtopic)}`,
      { method: "POST" }
    )
    return r.json()
  },

  checkAnswer: async (sessionId, question, correctAnswer,
    studentAnswer, subtopic, dimension, level) => {
    const r = await fetch(`${BASE_URL}/check/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        question,
        correct_answer: correctAnswer,
        student_answer: studentAnswer,
        subtopic,
        dimension,
        level
      })
    })
    return r.json()
  },

  generateDiscussion: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/discussion/${sessionId}`,
      { method: "POST" }
    )
    return r.json()
  },

  generateMasteryAll: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/mastery-all/${sessionId}`,
      { method: "POST" }
    )
    return r.json()
  },

  generateMasteryQuestion: async (sessionId, subtopic, dimension, level) => {
    const r = await fetch(
      `${BASE_URL}/generate/mastery-question/${sessionId}` +
      `?subtopic=${encodeURIComponent(subtopic)}&dimension=${dimension}&level=${level}`,
      { method: "POST" }
    )
    return r.json()
  },

  generateAnalysis: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/analysis/${sessionId}`,
      { method: "POST" }
    )
    return r.json()
  },

  guideProject: async (sessionId, projectIdea, message, progress) => {
    const r = await fetch(`${BASE_URL}/guide/project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        project_idea: projectIdea,
        message,
        progress
      })
    })
    return r.json()
  },

  checkOpenEnded: async (sessionId, template, question, response) => {
    const r = await fetch(`${BASE_URL}/check/open-ended`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        template,
        question,
        response
      })
    })
    return r.json()
  },

  generateReflection: async (sessionId, exitScore, masteryResult,
    projectIdea, templatesCompleted) => {
    const r = await fetch(
      `${BASE_URL}/generate/reflection/${sessionId}` +
      `?exit_ticket_score=${encodeURIComponent(exitScore)}` +
      `&mastery_gate_result=${encodeURIComponent(masteryResult)}` +
      `&project_idea=${encodeURIComponent(projectIdea)}` +
      `&templates_completed=${encodeURIComponent(templatesCompleted)}`,
      { method: "POST" }
    )
    return r.json()
  }
}
