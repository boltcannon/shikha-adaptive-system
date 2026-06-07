import React, { createContext, useContext, useEffect, useState } from "react"
import { api } from "../api/client"

const UnitContext = createContext()

export function UnitProvider({ children }) {
  // ── Unit / session ────────────────────────────────────────
  const [sessionId,        setSessionId]        = useState(null)
  const [unitInput,        setUnitInput]        = useState(null)
  const [generatedContent, setGeneratedContent] = useState(null)

  // Persist sessionId so teachers can resume after refresh
  useEffect(() => {
    if (sessionId) localStorage.setItem("sessionId", sessionId)
    else           localStorage.removeItem("sessionId")
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

  // Sync student identity to localStorage
  useEffect(() => { if (studentId)   localStorage.setItem("studentId",   studentId)   }, [studentId])
  useEffect(() => { if (studentName) localStorage.setItem("studentName", studentName) }, [studentName])
  useEffect(() => { if (classCode)   localStorage.setItem("classCode",   classCode)   }, [classCode])

  const saveStudentProgress = (updates) => {
    const newProgress = { ...studentProgress, ...updates }
    setStudentProgress(newProgress)
    localStorage.setItem("studentProgress", JSON.stringify(newProgress))
    if (studentId) {
      api.saveProgress(studentId, newProgress).catch(() => {})
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
  const [token,       setToken]       = useState(() => localStorage.getItem("token") || null)
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "null") }
    catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(true)

  // Verify token on app load — restores session for both teachers and students
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
            } else {
              const savedStudentId = localStorage.getItem("studentId")
              if (savedStudentId) {
                setStudentId(savedStudentId)
                setStudentName(user.name)
                try {
                  const progress = await api.getStudentProgress(savedStudentId)
                  if (progress.progress) setStudentProgress(progress.progress)
                } catch (e) {
                  console.log("Could not restore student progress from server")
                }
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

  const login = (userData, userToken) => {
    setCurrentUser(userData)
    setToken(userToken)
    localStorage.setItem("token",       userToken)
    localStorage.setItem("currentUser", JSON.stringify(userData))
  }

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
      current_screen      : "provocation",
      completed_templates : [],
      exit_ticket_score   : null,
      mastery_gate_result : null,
      project_idea        : "",
      reflection_done     : false,
    })
    localStorage.clear()
  }

  /** Clear all student state (called when teacher starts a new unit) */
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
    localStorage.removeItem("studentId")
    localStorage.removeItem("studentName")
    localStorage.removeItem("classCode")
    localStorage.removeItem("studentProgress")
    localStorage.removeItem("nclProgress")
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
    }}>
      {children}
    </UnitContext.Provider>
  )
}

export const useUnit = () => useContext(UnitContext)
