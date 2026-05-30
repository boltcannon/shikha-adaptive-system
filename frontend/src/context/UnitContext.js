import React, { createContext, useContext, useState } from "react"

const UnitContext = createContext()

export function UnitProvider({ children }) {
  const [sessionId, setSessionId] = useState(null)
  const [unitInput, setUnitInput] = useState(null)
  const [performance, setPerformance] = useState({
    exitTicketScore: null,
    masteryGateResult: null,
    projectIdea: "",
    completedTemplates: []
  })

  const updatePerformance = (key, value) => {
    setPerformance(prev => ({ ...prev, [key]: value }))
  }

  const addCompletedTemplate = (template) => {
    setPerformance(prev => ({
      ...prev,
      completedTemplates: [...prev.completedTemplates, template]
    }))
  }

  return (
    <UnitContext.Provider value={{
      sessionId, setSessionId,
      unitInput, setUnitInput,
      performance, updatePerformance,
      addCompletedTemplate
    }}>
      {children}
    </UnitContext.Provider>
  )
}

export const useUnit = () => useContext(UnitContext)
