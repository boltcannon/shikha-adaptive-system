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

  generateNclForSubtopic: async (sessionId, subtopic, studentObservation = "") => {
    const r = await fetch(
      `${BASE_URL}/generate/ncl/${sessionId}?subtopic=${encodeURIComponent(subtopic)}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ student_observation: studentObservation }),
      }
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

  generateSubtopics: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/subtopics/${sessionId}`,
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

  generateAnalysis: async (sessionId, weakSubtopics = []) => {
    const r = await fetch(
      `${BASE_URL}/generate/analysis/${sessionId}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ weak_subtopics: weakSubtopics }),
      }
    )
    return r.json()
  },

  generateNclReview: async (sessionId, weakSubtopics, wrongQuestions) => {
    const r = await fetch(
      `${BASE_URL}/generate/ncl-review/${sessionId}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          weak_subtopics : weakSubtopics  || [],
          wrong_questions: wrongQuestions || [],
        }),
      }
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

  saveProgress: async (studentId, progress) => {
    const r = await fetch(`${BASE_URL}/student/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, progress })
    })
    return r.json()
  },

  checkAnalysis: async (sessionId, responses) => {
    const r = await fetch(`${BASE_URL}/check/analysis`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ session_id: sessionId, responses })
    })
    return r.json()
  },

  getExitTicket: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/exit-ticket/${sessionId}`
    )
    return r.json()
  },

  checkAnswersBatch: async (sessionId, answers) => {
    const r = await fetch(`${BASE_URL}/check/answers-batch`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ session_id: sessionId, answers })
    })
    return r.json()
  },

  // ── Auth ──────────────────────────────────────────────────
  register: async (name, email, password, role) => {
    const r = await fetch(`${BASE_URL}/auth/register`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ name, email, password, role })
    })
    return r.json()
  },

  login: async (email, password) => {
    const r = await fetch(`${BASE_URL}/auth/login`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ email, password })
    })
    return r.json()
  },

  getMe: async (token) => {
    const r = await fetch(`${BASE_URL}/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
    return r.json()
  },

  getStudentProgress: async (studentId) => {
    const r = await fetch(`${BASE_URL}/student/${studentId}/progress`)
    return r.json()
  },

  getRacSuggestions: async (sessionId) => {
    const r = await fetch(
      `${BASE_URL}/generate/rac-suggestions/${sessionId}`,
      { method: "POST" }
    )
    return r.json()
  },

  generateRacTemplate: async (sessionId, projectIdea) => {
    const r = await fetch(
      `${BASE_URL}/generate/rac-template/${sessionId}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ project_idea: projectIdea }),
      }
    )
    return r.json()
  },

  checkRacSection: async (
    sessionId, projectIdea, sectionTitle, guidingQuestion, studentContent
  ) => {
    const r = await fetch(
      `${BASE_URL}/check/rac-section/${sessionId}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          project_idea     : projectIdea,
          section_title    : sectionTitle,
          guiding_question : guidingQuestion,
          student_content  : studentContent,
        }),
      }
    )
    return r.json()
  },

  saveRacArtifact: async (sessionId, projectIdea, reportTitle, sections) => {
    const r = await fetch(
      `${BASE_URL}/save/rac-artifact/${sessionId}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ project_idea: projectIdea, report_title: reportTitle, sections }),
      }
    )
    return r.json()
  },

  getContextSuggestions: async (grade, subject, chapter) => {
    const r = await fetch(
      `${BASE_URL}/generate/context-suggestions`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ grade, subject, chapter }),
      }
    )
    return r.json()
  },

  generateReflection: async (
    sessionId,
    exitTicketScore,
    masteryGateResult,
    projectIdea,
    templatesCompleted,
    provocationObservation = "",
    provocationReflections = []
  ) => {
    const r = await fetch(
      `${BASE_URL}/generate/reflection/${sessionId}`,
      {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          exit_ticket_score      : exitTicketScore,
          mastery_gate_result    : masteryGateResult,
          project_idea           : projectIdea,
          templates_completed    : templatesCompleted,
          provocation_observation: provocationObservation,
          provocation_reflections: provocationReflections,
        }),
      }
    )
    return r.json()
  }
}
