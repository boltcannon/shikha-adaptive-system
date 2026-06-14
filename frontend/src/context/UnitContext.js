import React, { createContext, useContext, useEffect, useState } from "react"
import { api } from "../api/client"

const UnitContext = createContext()

export function UnitProvider({ children }) {
  // ── Unit / session ────────────────────────────────────────
  const [sessionId,        setSessionId]        = useState(null)
  const [unitInput,        setUnitInput]        = useState(() => {
    try {
      const saved = localStorage.getItem("unitInput")
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [generatedContent, setGeneratedContent] = useState(null)

  useEffect(() => {
    if (sessionId) localStorage.setItem("sessionId", sessionId)
  }, [sessionId])

  useEffect(() => {
    if (unitInput) {
      localStorage.setItem("unitInput", JSON.stringify(unitInput))
    } else {
      localStorage.removeItem("unitInput")
    }
  }, [unitInput])

  // ── Performance tracking ──────────────────────────────────
  const [performance, setPerformance] = useState({
    exitTicketScore: null,
    masteryGateResult: null,
    projectIdea: "",
    completedTemplates: [],
  })

  const updatePerformance = (key, value) =>
    setPerformance(prev => ({ ...prev, [key]: value }))

  // ── Student identity ──────────────────────────────────────
  const [studentId,   setStudentId]   = useState(() => localStorage.getItem("studentId")   || null)
  const [studentName, setStudentName] = useState(() => localStorage.getItem("studentName") || null)

  useEffect(() => { if (studentId)   localStorage.setItem("studentId",   studentId)   }, [studentId])
  useEffect(() => { if (studentName) localStorage.setItem("studentName", studentName) }, [studentName])

  // ── Student progress ──────────────────────────────────────
  const [studentProgress, setStudentProgress] = useState(() => {
    try {
      const saved = localStorage.getItem("studentProgress")
      return saved ? JSON.parse(saved) : {
        current_screen      : "provocation",
        completed_templates : [],
        exit_ticket_score   : null,
        mastery_gate_result : null,
        project_idea        : "",
        reflection_done     : false,
      }
    } catch {
      return {
        current_screen: "provocation", completed_templates: [],
        exit_ticket_score: null, mastery_gate_result: null,
        project_idea: "", reflection_done: false,
      }
    }
  })

  const addCompletedTemplate = (template) => {
    setStudentProgress(prev => {
      const current = prev?.completed_templates || []
      if (current.includes(template)) return prev
      const updated = { ...prev, completed_templates: [...current, template] }
      localStorage.setItem("studentProgress", JSON.stringify(updated))
      return updated
    })
  }

  const saveStudentProgress = async (updates) => {
    // Read from localStorage so addCompletedTemplate changes aren't lost
    // due to React's batched state updates (stale closure issue)
    let currentProgress
    try {
      currentProgress = JSON.parse(localStorage.getItem("studentProgress") || "{}")
    } catch {
      currentProgress = studentProgress
    }
    const newProgress = { ...currentProgress, ...updates }
    // Persist session_id in the progress document so it can be retrieved from
    // MongoDB after logout (localStorage gets cleared on logout)
    if (sessionId) newProgress.session_id = sessionId
    setStudentProgress(newProgress)
    localStorage.setItem("studentProgress", JSON.stringify(newProgress))

    if (sessionId)  localStorage.setItem("sessionId",  sessionId)
    if (studentId)  localStorage.setItem("studentId",  studentId)

    if (updates.exit_ticket_score !== undefined) {
      updatePerformance("exitTicketScore", updates.exit_ticket_score)
    }
    if (updates.mastery_gate_result !== undefined) {
      updatePerformance("masteryGateResult", updates.mastery_gate_result)
    }

    if (studentId) {
      try { await api.saveProgress(studentId, newProgress) } catch { /* best-effort */ }
    }
  }

  // ── NCL progress ──────────────────────────────────────────
  const [nclProgress, setNclProgress] = useState(() => {
    try {
      const saved = localStorage.getItem("nclProgress")
      return saved ? JSON.parse(saved) : {
        completedSubtopics  : [],
        currentSubtopicIndex: 0,
        phase               : "learning",
      }
    } catch {
      return { completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" }
    }
  })

  const updateNclProgress = (updates) => {
    const newProgress = { ...nclProgress, ...updates }
    setNclProgress(newProgress)
    localStorage.setItem("nclProgress", JSON.stringify(newProgress))
  }

  // ── Auth ──────────────────────────────────────────────────
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null)
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null") }
    catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(true)
  const [resumeScreen, setResumeScreen] = useState(null)

  // ── Restore a saved student session ───────────────────────
  const _restoreStudentSession = async (savedStudentId, savedSessionId, savedProgressStr, userName) => {
    try {
      const savedProgress = JSON.parse(savedProgressStr)
      setStudentId(savedStudentId)
      if (userName) setStudentName(userName)
      setSessionId(savedSessionId)

      try {
        const sessionData = await api.getSession(savedSessionId)
        if (sessionData?.generated_content) setGeneratedContent(sessionData.generated_content)
        if (sessionData?.unit_input)        setUnitInput(sessionData.unit_input)
      } catch {
        // Fall back to regenerating all content
        const contentResult = await api.generateAll(savedSessionId)
        if (contentResult?.content) setGeneratedContent(contentResult.content)
      }

      const target = savedProgress.current_screen
      const isInProgress = target &&
        target !== "teacherInput" &&
        target !== "finalSummary" &&
        target !== "done"

      setResumeScreen(isInProgress ? "welcomeBack" : "teacherInput")
    } catch {
      setResumeScreen("teacherInput")
    }
  }

  // ── Verify token on page load ─────────────────────────────
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem("token")
      if (savedToken) {
        try {
          const user = await api.getMe(savedToken)
          if (user.user_id) {
            setCurrentUser(user)
            setToken(savedToken)
            // Ensure studentId is always synced with the authenticated user
            setStudentId(user.user_id)
            setStudentName(user.name)
            localStorage.setItem("studentId",   user.user_id)
            localStorage.setItem("studentName", user.name)

            const savedStudentId   = user.user_id
            const savedSessionId   = localStorage.getItem("sessionId")
            const savedProgressStr = localStorage.getItem("studentProgress")

            if (savedStudentId && savedSessionId) {
              try {
                const progressData = await api.getStudentProgress(savedStudentId)
                if (progressData.progress) {
                  const progress = progressData.progress
                  setStudentProgress(progress)
                  localStorage.setItem("studentProgress", JSON.stringify(progress))
                  await _restoreStudentSession(
                    savedStudentId, savedSessionId,
                    JSON.stringify(progress), user.name
                  )
                } else if (savedProgressStr) {
                  await _restoreStudentSession(
                    savedStudentId, savedSessionId,
                    savedProgressStr, user.name
                  )
                } else {
                  setResumeScreen("teacherInput")
                }
              } catch {
                if (savedProgressStr) {
                  await _restoreStudentSession(
                    savedStudentId, savedSessionId,
                    savedProgressStr, user.name
                  )
                } else {
                  setResumeScreen("teacherInput")
                }
              }
            } else {
              setResumeScreen("teacherInput")
            }
          } else {
            localStorage.removeItem("token")
            localStorage.removeItem("currentUser")
            setToken(null)
            setCurrentUser(null)
          }
        } catch {
          localStorage.removeItem("token")
          setToken(null)
          setCurrentUser(null)
        }
      }
      setAuthLoading(false)
    }
    verifyToken()
  }, []) // eslint-disable-line

  // ── Login ─────────────────────────────────────────────────
  const login = async (userData, userToken) => {
    setCurrentUser(userData)
    setToken(userToken)
    // Always set studentId from user_id — it's the student's permanent identity
    setStudentId(userData.user_id)
    setStudentName(userData.name)
    localStorage.setItem("token",       userToken)
    localStorage.setItem("currentUser", JSON.stringify(userData))
    localStorage.setItem("studentId",   userData.user_id)
    localStorage.setItem("studentName", userData.name)

    try {
      const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"
      const r = await fetch(`${BASE_URL}/student/${userData.user_id}/progress`)
      if (r.ok) {
        const data     = await r.json()
        const progress = data.progress

        const hasActiveSession =
          progress &&
          progress.current_screen &&
          progress.current_screen !== "teacherInput" &&
          progress.current_screen !== "finalSummary" &&
          progress.current_screen !== "done" &&
          progress.completed_templates?.length > 0

        if (hasActiveSession) {
          setStudentProgress(progress)
          localStorage.setItem("studentProgress", JSON.stringify(progress))

          // Retrieve session_id stored in progress doc, or fall back to localStorage
          const savedSessionId = progress.session_id || localStorage.getItem("sessionId")
          if (savedSessionId) {
            setSessionId(savedSessionId)
            localStorage.setItem("sessionId", savedSessionId)
            try {
              const sessionData = await api.getSession(savedSessionId)
              if (sessionData?.generated_content) setGeneratedContent(sessionData.generated_content)
              if (sessionData?.unit_input)        setUnitInput(sessionData.unit_input)
            } catch {
              console.log("Could not restore session content on login")
            }
          }

          setResumeScreen("welcomeBack")
          return
        }
      }
    } catch {
      console.log("Could not check progress on login")
    }

    // No active session in MongoDB — try localStorage as fallback
    const savedSessionId   = localStorage.getItem("sessionId")
    const savedProgressStr = localStorage.getItem("studentProgress")
    if (savedSessionId && savedProgressStr) {
      _restoreStudentSession(userData.user_id, savedSessionId, savedProgressStr, userData.name)
    } else {
      setResumeScreen("teacherInput")
    }
  }

  // ── Logout ────────────────────────────────────────────────
  const logout = () => {
    setCurrentUser(null)
    setToken(null)
    setSessionId(null)
    setUnitInput(null)
    setGeneratedContent(null)
    setStudentId(null)
    setStudentName(null)
    setResumeScreen(null)
    setNclProgress({ completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" })
    setStudentProgress({
      current_screen      : "teacherInput",
      completed_templates : [],
      exit_ticket_score   : null,
      mastery_gate_result : null,
      project_idea        : "",
      reflection_done     : false,
    })
    localStorage.clear()
  }

  // ── Clear student state for new unit ─────────────────────
  const clearStudentSession = () => {
    // studentId and studentName are the user's permanent auth identity — never clear them
    setUnitInput(null)
    setNclProgress({ completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" })
    setStudentProgress({
      current_screen: "provocation", completed_templates: [],
      exit_ticket_score: null, mastery_gate_result: null,
      project_idea: "", reflection_done: false,
    })
    localStorage.removeItem("studentProgress")
    localStorage.removeItem("nclProgress")
    localStorage.removeItem("sessionId")
    localStorage.removeItem("unitInput")
  }

  return (
    <UnitContext.Provider value={{
      sessionId, setSessionId,
      unitInput, setUnitInput,
      generatedContent, setGeneratedContent,
      performance, setPerformance, updatePerformance,
      studentId,   setStudentId,
      studentName, setStudentName,
      studentProgress, setStudentProgress,
      addCompletedTemplate,
      saveStudentProgress,
      clearStudentSession,
      nclProgress, updateNclProgress, setNclProgress,
      token, currentUser, authLoading, login, logout,
      resumeScreen, setResumeScreen,
    }}>
      {children}
    </UnitContext.Provider>
  )
}

export const useUnit = () => useContext(UnitContext)
