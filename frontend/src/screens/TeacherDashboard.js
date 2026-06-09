import React, { useState, useEffect } from "react"
import { useUnit } from "../context/UnitContext"
import { api } from "../api/client"
import SimpleLoader from "../components/SimpleLoader"

const TABS = [
  { key: "overview",        label: "Class Overview"  },
  { key: "live",            label: "Live View"       },
  { key: "exit_ticket",     label: "Exit Ticket"     },
  { key: "mastery",         label: "Mastery Gate"    },
  { key: "recommendations", label: "Recommendations" },
  { key: "final_report",    label: "Final Report"    },
]

const TEMPLATE_LABELS = {
  provocation    : "Provocation",
  ncl            : "NCL",
  analysis       : "Analysis",
  discussion     : "Discussion",
  masteryGate    : "Mastery Gate",
  projectPlanning: "Project Planning",
  rac            : "Research",
  reflection     : "Reflection",
}

// ── Helpers ──────────────────────────────────────────────────

function getStudentStatus(student) {
  const p = student.progress || {}
  if (p.reflection_done) return "Complete"
  if ((p.completed_templates || []).length > 0) return "In Progress"
  return "Not Started"
}

function getRecommendation(student) {
  const p           = student.progress || {}
  const exitScore   = p.exit_ticket_score          // already numeric from backend
  const masteryResult = p.mastery_gate_result || ""

  if (exitScore == null)
    return { template: "NCL", reason: "Exit ticket not yet completed" }
  if (exitScore < 2.5)
    return { template: "New Content Learning", reason: "Exit ticket below 50% — needs review" }

  if (masteryResult) {
    const parts = masteryResult.split("/")
    const score = parseInt(parts[0]) || 0
    const total = parseInt(parts[1]) || 6
    if (score / total < 0.5)
      return { template: "Analysis", reason: "Mastery Gate below 50% — needs practice" }
    if (score / total >= 0.8)
      return { template: "Transfer Phase", reason: "Ready for project work" }
  }
  return { template: "Continue", reason: "On track" }
}

// ── Shared UI pieces ─────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    "Complete"   : { bg: "#D5F5E3", color: "#1E8449" },
    "In Progress": { bg: "#FEF9E7", color: "#B7950B" },
    "Not Started": { bg: "#FADBD8", color: "#C0392B" },
  }
  const c = cfg[status] || cfg["Not Started"]
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: "2px 8px", borderRadius: "10px",
      fontSize: "11px", fontWeight: "bold", fontFamily: "Arial",
    }}>
      {status}
    </span>
  )
}

function SummaryCards({ results }) {
  const cards = [
    { label: "Total Students", value: results.total_students, color: "#1A5276", bg: "#EBF5FB" },
    { label: "Complete",       value: results.complete,       color: "#1E8449", bg: "#D5F5E3" },
    { label: "In Progress",    value: results.in_progress,    color: "#B7950B", bg: "#FEF9E7" },
    {
      label: "Avg Exit Score",
      value: results.avg_exit_score != null ? `${results.avg_exit_score}/5` : "—",
      color: "#C0392B", bg: "#FADBD8",
    },
  ]
  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
      {cards.map(card => (
        <div key={card.label} style={{
          flex: 1, minWidth: "90px", background: card.bg,
          borderRadius: "10px", padding: "14px", textAlign: "center",
        }}>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: card.color, fontFamily: "Arial", marginBottom: "2px" }}>
            {card.value}
          </p>
          <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial" }}>
            {card.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function StudentTable({ students, onSelectStudent, selectedStudent, columns }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F2F3F4" }}>
              {columns.map(col => (
                <th key={col.key} style={{
                  padding: "10px 14px", textAlign: "left",
                  color: "#1A5276", fontWeight: "bold",
                  borderBottom: "2px solid #E5E7E9", whiteSpace: "nowrap",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "24px", textAlign: "center", color: "#BDC3C7" }}>
                  No students have joined yet
                </td>
              </tr>
            ) : students.map((student, i) => (
              <tr
                key={student.student_id || i}
                onClick={() => onSelectStudent(student)}
                style={{
                  borderBottom: "1px solid #F2F3F4",
                  background: selectedStudent?.student_id === student.student_id
                    ? "#EBF5FB" : i % 2 === 0 ? "white" : "#FAFAFA",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "10px 14px" }}>
                    {col.render ? col.render(student) : (student[col.key] || "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab components ────────────────────────────────────────────

function OverviewTab({ results, onSelectStudent, selectedStudent }) {
  return (
    <div>
      <SummaryCards results={results} />

      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontWeight: "bold", fontSize: "14px", color: "#1A5276", fontFamily: "Arial", marginBottom: "12px" }}>
          Template Completion Across Class
        </p>
        {Object.entries(results.template_counts || {}).map(([key, count]) => {
          const pct = results.total_students > 0
            ? Math.round((count / results.total_students) * 100) : 0
          return (
            <div key={key} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "12px", color: "#2C3E50", fontFamily: "Arial" }}>
                  {TEMPLATE_LABELS[key] || key}
                </span>
                <span style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial" }}>
                  {count}/{results.total_students}
                </span>
              </div>
              <div style={{ background: "#F2F3F4", borderRadius: "4px", height: "6px" }}>
                <div style={{
                  background: pct >= 80 ? "#1E8449" : pct >= 50 ? "#B7950B" : "#E87722",
                  borderRadius: "4px", height: "6px",
                  width: `${pct}%`, transition: "width 0.3s",
                }} />
              </div>
            </div>
          )
        })}
      </div>

      <StudentTable
        students={results.students || []}
        onSelectStudent={onSelectStudent}
        selectedStudent={selectedStudent}
        columns={[
          { key: "student_name", label: "Student" },
          { key: "templates",    label: "Templates",
            render: s => `${(s.progress?.completed_templates || []).length}/8` },
          { key: "exit",         label: "Exit Ticket",
            render: s => s.progress?.exit_ticket_score != null
              ? `${s.progress.exit_ticket_score}/5` : "—" },
          { key: "mastery",      label: "Mastery",
            render: s => s.progress?.mastery_gate_result || "—" },
          { key: "status",       label: "Status",
            render: s => <StatusBadge status={getStudentStatus(s)} /> },
        ]}
      />
    </div>
  )
}

function LiveTab({ results, onSelectStudent, selectedStudent }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontWeight: "bold", fontSize: "14px", color: "#1A5276", fontFamily: "Arial", marginBottom: "4px" }}>
          Where is everyone right now?
        </p>
        <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
          Based on last saved progress
        </p>
      </div>
      <StudentTable
        students={results.students || []}
        onSelectStudent={onSelectStudent}
        selectedStudent={selectedStudent}
        columns={[
          { key: "student_name",  label: "Student" },
          { key: "current",       label: "Currently On",
            render: s => TEMPLATE_LABELS[s.progress?.current_screen]
              || s.progress?.current_screen || "Not started" },
          { key: "last",          label: "Last Completed",
            render: s => {
              const done = s.progress?.completed_templates || []
              if (!done.length) return "None"
              return TEMPLATE_LABELS[done[done.length - 1]] || done[done.length - 1]
            }},
          { key: "progress",      label: "Progress",
            render: s => {
              const count = (s.progress?.completed_templates || []).length
              const pct   = Math.round((count / 8) * 100)
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ background: "#F2F3F4", borderRadius: "4px", height: "6px", width: "60px" }}>
                    <div style={{ background: "#1A5276", borderRadius: "4px", height: "6px", width: `${pct}%` }} />
                  </div>
                  <span style={{ fontSize: "11px", color: "#5D6D7E" }}>{count}/8</span>
                </div>
              )
            }},
          { key: "status",        label: "Status",
            render: s => <StatusBadge status={getStudentStatus(s)} /> },
        ]}
      />
    </div>
  )
}

function ExitTicketTab({ results, onSelectStudent, selectedStudent }) {
  const dist = results.score_distribution || {}
  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Strong (4–5)",         count: dist.green || 0, bg: "#D5F5E3", color: "#1E8449" },
          { label: "Developing (2–3)",      count: dist.amber || 0, bg: "#FEF9E7", color: "#B7950B" },
          { label: "Needs Support (0–1)",   count: dist.red   || 0, bg: "#FADBD8", color: "#C0392B" },
        ].map(item => (
          <div key={item.label} style={{
            flex: 1, background: item.bg,
            borderRadius: "10px", padding: "14px", textAlign: "center",
          }}>
            <p style={{ fontSize: "28px", fontWeight: "bold", color: item.color, fontFamily: "Arial", marginBottom: "2px" }}>
              {item.count}
            </p>
            <p style={{ fontSize: "11px", color: "#5D6D7E", fontFamily: "Arial" }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <StudentTable
        students={results.students || []}
        onSelectStudent={onSelectStudent}
        selectedStudent={selectedStudent}
        columns={[
          { key: "student_name", label: "Student" },
          { key: "score",        label: "Score",
            render: s => {
              const sc = s.progress?.exit_ticket_score
              if (sc == null) return "—"
              const color = sc >= 4 ? "#1E8449" : sc >= 2 ? "#B7950B" : "#C0392B"
              return <span style={{ fontWeight: "bold", color, fontFamily: "Arial" }}>{sc}/5</span>
            }},
          { key: "band",         label: "Band",
            render: s => {
              const sc = s.progress?.exit_ticket_score
              if (sc == null) return "—"
              const label = sc >= 4 ? "Strong" : sc >= 2 ? "Developing" : "Needs Support"
              const bg    = sc >= 4 ? "#D5F5E3" : sc >= 2 ? "#FEF9E7" : "#FADBD8"
              const color = sc >= 4 ? "#1E8449" : sc >= 2 ? "#B7950B" : "#C0392B"
              return (
                <span style={{ background: bg, color, padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold" }}>
                  {label}
                </span>
              )
            }},
          { key: "action",       label: "Recommended Action",
            render: s => {
              const sc = s.progress?.exit_ticket_score
              if (sc == null) return "Complete NCL first"
              if (sc < 2)    return "Run another NCL class"
              if (sc < 4)    return "Review before Analysis"
              return "Ready for Analysis"
            }},
        ]}
      />
    </div>
  )
}

function MasteryTab({ results, onSelectStudent, selectedStudent }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontWeight: "bold", fontSize: "14px", color: "#1A5276", fontFamily: "Arial", marginBottom: "4px" }}>
          Mastery Gate Results
        </p>
        <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
          Click a student to see their full journey in the panel
        </p>
      </div>
      <StudentTable
        students={results.students || []}
        onSelectStudent={onSelectStudent}
        selectedStudent={selectedStudent}
        columns={[
          { key: "student_name",   label: "Student" },
          { key: "mastery_result", label: "Result",
            render: s => s.progress?.mastery_gate_result || "—" },
          { key: "mastery_band",   label: "Status",
            render: s => {
              const result = s.progress?.mastery_gate_result || ""
              if (!result) return "—"
              const isGreen = result.includes("green")
              const isAmber = result.includes("amber")
              return (
                <span style={{
                  background: isGreen ? "#D5F5E3" : isAmber ? "#FEF9E7" : "#FADBD8",
                  color: isGreen ? "#1E8449" : isAmber ? "#B7950B" : "#C0392B",
                  padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "bold",
                }}>
                  {isGreen ? "Ready" : isAmber ? "Developing" : "Needs Support"}
                </span>
              )
            }},
          { key: "transfer",       label: "Transfer Ready",
            render: s => {
              const result = s.progress?.mastery_gate_result || ""
              return result.includes("green") ? "Yes" : "Not yet"
            }},
        ]}
      />
    </div>
  )
}

function RecommendationsTab({ results, onSelectStudent, selectedStudent }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: "16px" }}>
        <p style={{ fontWeight: "bold", fontSize: "14px", color: "#1A5276", fontFamily: "Arial", marginBottom: "4px" }}>
          What Each Student Needs Next
        </p>
        <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
          Based on exit ticket and mastery gate results
        </p>
      </div>
      <StudentTable
        students={results.students || []}
        onSelectStudent={onSelectStudent}
        selectedStudent={selectedStudent}
        columns={[
          { key: "student_name",  label: "Student" },
          { key: "recommended",   label: "Recommended Template",
            render: s => {
              const rec = getRecommendation(s)
              return (
                <span style={{
                  background: "#EBF5FB", color: "#1A5276",
                  padding: "2px 8px", borderRadius: "6px",
                  fontSize: "12px", fontWeight: "bold", fontFamily: "Arial",
                }}>
                  {rec.template}
                </span>
              )
            }},
          { key: "reason",        label: "Reason",
            render: s => (
              <span style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial" }}>
                {getRecommendation(s).reason}
              </span>
            )},
          { key: "priority",      label: "Priority",
            render: s => {
              const rec = getRecommendation(s)
              const urgent = rec.template === "New Content Learning"
              return (
                <span style={{
                  background: urgent ? "#FADBD8" : "#D5F5E3",
                  color:      urgent ? "#C0392B" : "#1E8449",
                  padding: "2px 8px", borderRadius: "6px",
                  fontSize: "11px", fontWeight: "bold",
                }}>
                  {urgent ? "Urgent" : "On Track"}
                </span>
              )
            }},
        ]}
      />
    </div>
  )
}

function FinalReportTab({ results, onSelectStudent, selectedStudent }) {
  const complete   = (results.students || []).filter(s => s.progress?.reflection_done)
  const inProgress = (results.students || []).filter(
    s => !s.progress?.reflection_done && (s.progress?.completed_templates || []).length > 0
  )
  const notStarted = (results.students || []).filter(
    s => (s.progress?.completed_templates || []).length === 0
  )

  return (
    <div>
      <SummaryCards results={results} />

      {complete.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontWeight: "bold", fontSize: "14px", color: "#1E8449", fontFamily: "Arial", marginBottom: "12px" }}>
            Unit Complete ({complete.length} student{complete.length !== 1 ? "s" : ""})
          </p>
          <StudentTable
            students={complete}
            onSelectStudent={onSelectStudent}
            selectedStudent={selectedStudent}
            columns={[
              { key: "student_name", label: "Student" },
              { key: "exit",    label: "Exit Ticket",
                render: s => s.progress?.exit_ticket_score != null ? `${s.progress.exit_ticket_score}/5` : "—" },
              { key: "mastery", label: "Mastery Gate",
                render: s => s.progress?.mastery_gate_result || "—" },
              { key: "project", label: "Project",
                render: s => {
                  const idea = s.progress?.project_idea
                  return idea ? `${idea.substring(0, 45)}${idea.length > 45 ? "..." : ""}` : "—"
                }},
              { key: "status",  label: "Status",
                render: () => <StatusBadge status="Complete" /> },
            ]}
          />
        </div>
      )}

      {inProgress.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontWeight: "bold", fontSize: "14px", color: "#B7950B", fontFamily: "Arial", marginBottom: "12px" }}>
            In Progress ({inProgress.length} student{inProgress.length !== 1 ? "s" : ""})
          </p>
          <StudentTable
            students={inProgress}
            onSelectStudent={onSelectStudent}
            selectedStudent={selectedStudent}
            columns={[
              { key: "student_name", label: "Student" },
              { key: "current",      label: "Currently On",
                render: s => TEMPLATE_LABELS[s.progress?.current_screen] || "—" },
              { key: "progress",     label: "Progress",
                render: s => `${(s.progress?.completed_templates || []).length}/8` },
              { key: "status",       label: "Status",
                render: () => <StatusBadge status="In Progress" /> },
            ]}
          />
        </div>
      )}

      {notStarted.length > 0 && (
        <div>
          <p style={{ fontWeight: "bold", fontSize: "14px", color: "#C0392B", fontFamily: "Arial", marginBottom: "12px" }}>
            Not Started ({notStarted.length} student{notStarted.length !== 1 ? "s" : ""})
          </p>
          <StudentTable
            students={notStarted}
            onSelectStudent={onSelectStudent}
            selectedStudent={selectedStudent}
            columns={[
              { key: "student_name", label: "Student" },
              { key: "status",       label: "Status",
                render: () => <StatusBadge status="Not Started" /> },
            ]}
          />
        </div>
      )}

      {(results.students || []).length === 0 && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#BDC3C7", fontFamily: "Arial" }}>
            No students have joined this class yet
          </p>
        </div>
      )}
    </div>
  )
}

// ── Student drill-down panel ──────────────────────────────────

function StudentPanel({ student, onClose }) {
  const p         = student.progress || {}
  const completed = p.completed_templates || []
  const rec       = getRecommendation(student)

  return (
    <div style={{
      width: "272px", flexShrink: 0,
      background: "white", borderRadius: "12px",
      border: "1px solid #BDC3C7", padding: "16px",
      height: "fit-content", position: "sticky", top: "20px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: "14px", paddingBottom: "12px", borderBottom: "1px solid #F2F3F4",
      }}>
        <div>
          <p style={{ fontWeight: "bold", fontSize: "15px", color: "#1A5276", fontFamily: "Arial", marginBottom: "4px" }}>
            {student.student_name}
          </p>
          <StatusBadge status={getStudentStatus(student)} />
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#95A5A6", lineHeight: 1 }}
        >
          &times;
        </button>
      </div>

      {/* Journey */}
      <p style={{ fontSize: "11px", fontWeight: "bold", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Journey
      </p>
      <div style={{ marginBottom: "16px" }}>
        {Object.keys(TEMPLATE_LABELS).map(key => {
          const isDone    = completed.includes(key)
          const isCurrent = p.current_screen === key
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
              <span style={{
                fontSize: "12px", width: "14px", textAlign: "center",
                color: isDone ? "#1E8449" : isCurrent ? "#E87722" : "#BDC3C7",
              }}>
                {isDone ? "+" : isCurrent ? ">" : "o"}
              </span>
              <span style={{
                fontSize: "12px", fontFamily: "Arial",
                color: isDone ? "#2C3E50" : isCurrent ? "#E87722" : "#BDC3C7",
                fontWeight: isCurrent ? "bold" : "normal",
              }}>
                {TEMPLATE_LABELS[key]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Performance */}
      <p style={{ fontSize: "11px", fontWeight: "bold", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Performance
      </p>
      <div style={{ marginBottom: "16px" }}>
        {[
          { label: "Exit Ticket",  value: p.exit_ticket_score != null ? `${p.exit_ticket_score}/5` : "—" },
          { label: "Mastery Gate", value: p.mastery_gate_result || "—" },
          { label: "Project",      value: p.project_idea ? `${p.project_idea.substring(0, 45)}${p.project_idea.length > 45 ? "..." : ""}` : "—" },
        ].map(item => (
          <div key={item.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "6px 0", borderBottom: "1px solid #F2F3F4",
          }}>
            <span style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial", flexShrink: 0, marginRight: "8px" }}>
              {item.label}
            </span>
            <span style={{ fontSize: "12px", color: "#2C3E50", fontFamily: "Arial", fontWeight: "bold", textAlign: "right", wordBreak: "break-word", maxWidth: "140px" }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <p style={{ fontSize: "11px", fontWeight: "bold", color: "#5D6D7E", fontFamily: "Arial", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Recommended Next
      </p>
      <div style={{ background: "#EBF5FB", borderRadius: "8px", padding: "10px" }}>
        <p style={{ fontWeight: "bold", fontSize: "13px", color: "#1A5276", fontFamily: "Arial", marginBottom: "4px" }}>
          {rec.template}
        </p>
        <p style={{ fontSize: "12px", color: "#5D6D7E", fontFamily: "Arial" }}>
          {rec.reason}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function TeacherDashboard({ onBack }) {
  const { token, currentUser } = useUnit()

  const [myClasses,      setMyClasses]      = useState([])
  const [selectedClass,  setSelectedClass]  = useState(null)
  const [classResults,   setClassResults]   = useState(null)
  const [activeTab,      setActiveTab]      = useState("overview")
  const [selectedStudent,setSelectedStudent]= useState(null)
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)
  const [classCodeInput, setClassCodeInput] = useState("")

  useEffect(() => {
    loadMyClasses()
  }, []) // eslint-disable-line

  const loadMyClasses = async () => {
    setLoadingClasses(true)
    try {
      const data = await api.getTeacherClasses(token)
      if (data.classes) {
        setMyClasses(data.classes)
        if (data.classes.length === 1) {
          setSelectedClass(data.classes[0])
          loadClassResults(data.classes[0].class_code)
        }
      }
    } catch (e) {
      console.log("Could not load classes")
    }
    setLoadingClasses(false)
  }

  const loadClassResults = async (code) => {
    setLoadingResults(true)
    setSelectedStudent(null)
    try {
      const data = await api.getClassResults(code)
      setClassResults(data)
    } catch (e) {
      console.log("Could not load results")
    }
    setLoadingResults(false)
  }

  const handleClassSelect = (cls) => {
    setSelectedClass(cls)
    setActiveTab("overview")
    loadClassResults(cls.class_code)
  }

  const handleManualCode = async () => {
    const code = classCodeInput.trim().toUpperCase()
    if (!code) return
    setLoadingResults(true)
    try {
      const data = await api.getClassResults(code)
      setClassResults(data)
      setSelectedClass({ class_code: code })
      setActiveTab("overview")
    } catch (e) {
      console.log("Could not load class")
    }
    setLoadingResults(false)
  }

  return (
    <div>
      {/* ── Header ─────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1A5276", fontFamily: "Arial", marginBottom: "4px" }}>
            Teacher Dashboard
          </h1>
          <p style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
            {currentUser?.name || "Teacher"}
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="btn-secondary" style={{ padding: "8px 16px" }}>
            Back to Unit
          </button>
        )}
      </div>

      {/* ── Class selector ─────────────────────────── */}
      {loadingClasses ? (
        <SimpleLoader />
      ) : myClasses.length === 0 ? (
        <div className="card" style={{ marginBottom: "20px" }}>
          <p style={{ color: "#5D6D7E", fontFamily: "Arial", fontSize: "14px", marginBottom: "12px" }}>
            No classes yet — generate a unit and click Share with Class to create one.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Or enter a class code directly"
              value={classCodeInput}
              onChange={e => setClassCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleManualCode()}
              style={{
                flex: 1, padding: "10px", borderRadius: "8px",
                border: "1px solid #BDC3C7", fontFamily: "Arial", fontSize: "14px",
              }}
            />
            <button className="btn-primary" onClick={handleManualCode} style={{ padding: "10px 16px" }}>
              Load
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
          {myClasses.map(cls => (
            <button
              key={cls.class_code}
              onClick={() => handleClassSelect(cls)}
              style={{
                background: selectedClass?.class_code === cls.class_code ? "#1A5276" : "white",
                color:      selectedClass?.class_code === cls.class_code ? "white"   : "#1A5276",
                border: "2px solid #1A5276", borderRadius: "8px",
                padding: "8px 16px", cursor: "pointer",
                fontFamily: "Arial", fontSize: "13px",
              }}
            >
              {cls.unit_input?.chapter || cls.class_code}
              {" "}
              <span style={{ opacity: 0.7, fontSize: "11px", letterSpacing: "1px" }}>
                {cls.class_code}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Empty state ────────────────────────────── */}
      {!classResults && !loadingResults && (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#5D6D7E", fontFamily: "Arial" }}>
            Select a class above to see results
          </p>
        </div>
      )}

      {loadingResults && <SimpleLoader />}

      {/* ── Dashboard ──────────────────────────────── */}
      {classResults && !loadingResults && (
        <div>
          {/* Class code badge */}
          <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              background: "#1A5276", color: "white",
              fontFamily: "Arial", fontSize: "13px", fontWeight: "bold",
              padding: "4px 12px", borderRadius: "6px", letterSpacing: "1px",
            }}>
              {classResults.class_code}
            </span>
            {selectedClass?.unit_input && (
              <span style={{ fontSize: "13px", color: "#5D6D7E", fontFamily: "Arial" }}>
                {selectedClass.unit_input.subject} — {selectedClass.unit_input.chapter}
                {selectedClass.unit_input.grade && ` · ${selectedClass.unit_input.grade}`}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", borderBottom: "2px solid #F2F3F4",
            marginBottom: "20px", overflowX: "auto",
          }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedStudent(null) }}
                style={{
                  padding: "10px 16px", border: "none", background: "transparent",
                  cursor: "pointer", fontFamily: "Arial", fontSize: "13px",
                  fontWeight: activeTab === tab.key ? "bold" : "normal",
                  color:      activeTab === tab.key ? "#1A5276" : "#5D6D7E",
                  borderBottom: activeTab === tab.key ? "2px solid #E87722" : "none",
                  whiteSpace: "nowrap", marginBottom: "-2px",
                  transition: "color 0.1s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content + optional student panel side-by-side */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {activeTab === "overview"        && <OverviewTab        results={classResults} onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />}
              {activeTab === "live"            && <LiveTab            results={classResults} onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />}
              {activeTab === "exit_ticket"     && <ExitTicketTab      results={classResults} onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />}
              {activeTab === "mastery"         && <MasteryTab         results={classResults} onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />}
              {activeTab === "recommendations" && <RecommendationsTab results={classResults} onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />}
              {activeTab === "final_report"    && <FinalReportTab     results={classResults} onSelectStudent={setSelectedStudent} selectedStudent={selectedStudent} />}
            </div>

            {selectedStudent && (
              <StudentPanel
                student={selectedStudent}
                onClose={() => setSelectedStudent(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
