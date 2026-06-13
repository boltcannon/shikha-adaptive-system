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

      const contentResult = await api.generateAll(savedSessionId)
      if (contentResult?.content) setGeneratedContent(contentResult.content)

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

            const savedStudentId   = localStorage.getItem("studentId")
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
  const login = (userData, userToken) => {
    setCurrentUser(userData)
    setToken(userToken)
    localStorage.setItem("token",       userToken)
    localStorage.setItem("currentUser", JSON.stringify(userData))

    const savedStudentId   = localStorage.getItem("studentId")
    const savedSessionId   = localStorage.getItem("sessionId")
    const savedProgressStr = localStorage.getItem("studentProgress")

    if (savedStudentId && savedSessionId && savedProgressStr) {
      _restoreStudentSession(savedStudentId, savedSessionId, savedProgressStr, userData.name)
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
    setStudentId(null)
    setStudentName(null)
    setUnitInput(null)
    setNclProgress({ completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" })
    setStudentProgress({
      current_screen: "provocation", completed_templates: [],
      exit_ticket_score: null, mastery_gate_result: null,
      project_idea: "", reflection_done: false,
    })
    localStorage.removeItem("studentId")
    localStorage.removeItem("studentName")
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
