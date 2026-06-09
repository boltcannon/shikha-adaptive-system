import React, { createContext, useContext, useEffect, useState } from "react"
import { api } from "../api/client"

const UnitContext = createContext()

export function UnitProvider({ children }) {
  // ── Unit / session ────────────────────────────────────────
  const [sessionId,        setSessionId]        = useState(null)
  const [unitInput,        setUnitInput]        = useState(null)
  const [generatedContent, setGeneratedContent] = useState(null)

  // Persist sessionId to localStorage whenever it is set.
  // Intentionally does NOT remove when null — explicit removal happens
  // in clearStudentSession / handleNewUnit so resume data survives logout.
  useEffect(() => {
    if (sessionId) localStorage.setItem("sessionId", sessionId)
  }, [sessionId])

  // ── Teacher performance tracking (solo / preview) ─────────
  const [performance, setPerformance] = useState({
    exitTicketScore: null,
    masteryGateResult: null,
    projectIdea: "",
    completedTemplates: [],
  })

  const updatePerformance = (key, value) =>
    setPerformance(prev => ({ ...prev, [key]: value }))

  const addCompletedTemplate = (template) =>
    setPerformance(prev => ({
      ...prev,
      completedTemplates: [...prev.completedTemplates, template],
    }))

  // ── Student identity (persisted across page refreshes) ────
  const [studentId,   setStudentId]   = useState(() => localStorage.getItem("studentId")   || null)
  const [studentName, setStudentName] = useState(() => localStorage.getItem("studentName") || null)
  const [classCode,   setClassCode]   = useState(() => localStorage.getItem("classCode")   || null)

  // ── Student progress (persisted) ─────────────────────────
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

  // Sync student identity to localStorage (set-only — removal is explicit)
  useEffect(() => { if (studentId)   localStorage.setItem("studentId",   studentId)   }, [studentId])
  useEffect(() => { if (studentName) localStorage.setItem("studentName", studentName) }, [studentName])
  useEffect(() => { if (classCode)   localStorage.setItem("classCode",   classCode)   }, [classCode])

  // Save progress + ensure resume keys are always written
  const saveStudentProgress = async (updates) => {
    const newProgress = { ...studentProgress, ...updates }
    setStudentProgress(newProgress)
    localStorage.setItem("studentProgress", JSON.stringify(newProgress))

    // Always pin resume keys so they survive a logout → re-login cycle
    if (sessionId)  localStorage.setItem("sessionId",  sessionId)
    if (studentId)  localStorage.setItem("studentId",  studentId)

    // Keep performance state in sync for adaptive routing
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

  // ── NCL multi-subtopic progress ───────────────────────────
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

  // ── Auth state ────────────────────────────────────────────
  const [token,        setToken]        = useState(() => localStorage.getItem("token") || null)
  const [currentUser,  setCurrentUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null") }
    catch { return null }
  })
  const [authLoading,  setAuthLoading]  = useState(true)
  // Screen to navigate to after auth (page-refresh AND same-tab login paths)
  const [resumeScreen, setResumeScreen] = useState(null)

  // ── Helper: restore a student session from saved data ────
  // Called by both verifyToken (page-refresh) and login() (same-tab)
  const _restoreStudentSession = async (savedStudentId, savedSessionId, savedProgressStr, userName) => {
    try {
      const savedProgress = JSON.parse(savedProgressStr)
      setStudentId(savedStudentId)
      if (userName) setStudentName(userName)
      setSessionId(savedSessionId)

      // Reload generated content from backend cache so templates have data
      const contentResult = await api.generateAll(savedSessionId)
      if (contentResult?.content) setGeneratedContent(contentResult.content)

      const target = savedProgress.current_screen
      setResumeScreen(target && target !== "teacherInput" ? target : "provocation")
    } catch {
      setResumeScreen("teacherInput")
    }
  }

  // ── Verify token on app load (page-refresh path) ─────────
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem("token")
      if (savedToken) {
        try {
          const user = await api.getMe(savedToken)
          if (user.user_id) {
            setCurrentUser(user)
            setToken(savedToken)
            if (user.role === "teacher") {
              const savedSession = localStorage.getItem("sessionId")
              if (savedSession) setSessionId(savedSession)
              setResumeScreen("teacherInput")
            } else {
              // Student: restore from MongoDB (authoritative source)
              const savedStudentId  = localStorage.getItem("studentId")
              const savedSessionId  = localStorage.getItem("sessionId")
              const savedProgressStr = localStorage.getItem("studentProgress")

              if (savedStudentId && savedSessionId) {
                try {
                  // Prefer server-side progress (most up-to-date)
                  const progressData = await api.getStudentProgress(savedStudentId)
                  if (progressData.progress) {
                    const progress = progressData.progress
                    setStudentProgress(progress)
                    // Persist the server copy locally
                    localStorage.setItem("studentProgress", JSON.stringify(progress))
                    await _restoreStudentSession(
                      savedStudentId, savedSessionId,
                      JSON.stringify(progress), user.name
                    )
                  } else if (savedProgressStr) {
                    // Fall back to local copy
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
            }
          } else {
            localStorage.removeItem("token")
            localStorage.removeItem("currentUser")
            setToken(null)
            setCurrentUser(null)
          }
        } catch (e) {
          localStorage.removeItem("token")
          setToken(null)
          setCurrentUser(null)
        }
      }
      setAuthLoading(false)
    }
    verifyToken()
  }, []) // eslint-disable-line

  // ── Login (same-tab path) ─────────────────────────────────
  const login = (userData, userToken) => {
    setCurrentUser(userData)
    setToken(userToken)
    localStorage.setItem("token",       userToken)
    localStorage.setItem("currentUser", JSON.stringify(userData))

    // For returning students: restore their previous session immediately
    // (without waiting for a page refresh — verifyToken won't re-run)
    if (userData.role === "student") {
      const savedStudentId  = localStorage.getItem("studentId")
      const savedSessionId  = localStorage.getItem("sessionId")
      const savedProgressStr = localStorage.getItem("studentProgress")

      if (savedStudentId && savedSessionId && savedProgressStr) {
        // Run async restore without awaiting — resumeScreen will be set
        // and App.js effect will navigate once it fires
        _restoreStudentSession(
          savedStudentId, savedSessionId,
          savedProgressStr, userData.name
        )
        // _restoreStudentSession sets resumeScreen when done
      }
      // If no saved session: App.js will go to teacherInput (from onNavigate call in AuthScreen)
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setToken(null)
    // Reset session-dependent React state — but do NOT wipe localStorage
    // resume keys (studentId, sessionId, studentProgress) so the student
    // can pick up exactly where they left off after signing back in.
    setSessionId(null)
    setUnitInput(null)
    setGeneratedContent(null)
    setStudentId(null)
    setStudentName(null)
    setNclProgress({ completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" })
    setStudentProgress({
      current_screen      : "provocation",
      completed_templates : [],
      exit_ticket_score   : null,
      mastery_gate_result : null,
      project_idea        : "",
      reflection_done     : false,
    })
    // Clear auth tokens only — student resume data intentionally left in localStorage
    localStorage.removeItem("token")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("autoClassCode")
  }

  /** Clear all student state (called when starting a fresh unit) */
  const clearStudentSession = () => {
    setStudentId(null)
    setStudentName(null)
    setClassCode(null)
    setNclProgress({ completedSubtopics: [], currentSubtopicIndex: 0, phase: "learning" })
    setStudentProgress({
      current_screen: "provocation", completed_templates: [],
      exit_ticket_score: null, mastery_gate_result: null,
      project_idea: "", reflection_done: false,
    })
    // Explicit removal of all resume keys when starting fresh
    localStorage.removeItem("studentId")
    localStorage.removeItem("studentName")
    localStorage.removeItem("classCode")
    localStorage.removeItem("studentProgress")
    localStorage.removeItem("nclProgress")
    localStorage.removeItem("sessionId")
  }

  return (
    <UnitContext.Provider value={{
      // Unit
      sessionId, setSessionId,
      unitInput, setUnitInput,
      generatedContent, setGeneratedContent,
      // Teacher performance
      performance, setPerformance, updatePerformance, addCompletedTemplate,
      // Student identity
      studentId,   setStudentId,
      studentName, setStudentName,
      classCode,   setClassCode,
      // Student progress
      studentProgress, setStudentProgress,
      saveStudentProgress,
      clearStudentSession,
      // NCL progress
      nclProgress, updateNclProgress,
      // Auth
      token, currentUser, authLoading, login, logout,
      resumeScreen,
    }}>
      {children}
    </UnitContext.Provider>
  )
}

export const useUnit = () => useContext(UnitContext)
