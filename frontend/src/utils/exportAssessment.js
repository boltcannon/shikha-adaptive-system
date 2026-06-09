import jsPDF from "jspdf"

/**
 * Exports mastery gate questions as a styled A4 PDF.
 *
 * @param {object} questions   — { subtopic_key: { knowledge: [q,q], skills: [q,q] } }
 * @param {object} unitInput   — { grade, subject, chapter, context }
 * @param {object} options     — { includeAnswers, title, schoolName }
 */
export function exportAssessmentAsPDF(questions, unitInput, options = {}) {
  const {
    includeAnswers = false,
    title      = "Assessment",
    schoolName = "Shikha Academy",
  } = options

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

  const pageWidth    = 210
  const pageHeight   = 297
  const margin       = 20
  const contentWidth = pageWidth - margin * 2

  // ── Palette ──────────────────────────────────────────────────────
  const darkBlue  = [26,  82,  118]
  const orange    = [232, 119, 34]
  const white     = [255, 255, 255]
  const lightGrey = [242, 243, 244]
  const bodyColor = [44,  62,  80]
  const subColor  = [93,  109, 126]
  const green     = [30,  132, 73]

  let yPos = 0
  let questionNumber = 1

  // ── HEADER ───────────────────────────────────────────────────────
  pdf.setFillColor(...darkBlue)
  pdf.rect(0, 0, pageWidth, 40, "F")

  pdf.setFillColor(...orange)
  pdf.rect(0, 38, pageWidth, 2, "F")

  pdf.setTextColor(...orange)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text(schoolName.toUpperCase(), margin, 12)

  pdf.setTextColor(...white)
  pdf.setFontSize(16)
  pdf.setFont("helvetica", "bold")
  pdf.text(title, margin, 24)

  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(200, 220, 240)
  const unitInfo = [unitInput?.grade, unitInput?.subject, unitInput?.chapter]
    .filter(Boolean).join("  ·  ")
  pdf.text(unitInfo, margin, 33)

  if (includeAnswers) {
    pdf.setTextColor(255, 200, 100)
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "bold")
    pdf.text("ANSWER KEY — TEACHER COPY", pageWidth - margin, 12, { align: "right" })
  }

  yPos = 50

  // ── STUDENT INFO BOX ─────────────────────────────────────────────
  if (!includeAnswers) {
    pdf.setDrawColor(...darkBlue)
    pdf.setLineWidth(0.3)
    pdf.rect(margin, yPos, contentWidth, 16)
    pdf.setTextColor(...bodyColor)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.text("Name: _______________________________", margin + 4, yPos + 7)
    pdf.text(
      `Date: _______________   Score: _____ / ${countTotalQuestions(questions)}`,
      margin + 4, yPos + 13
    )
    yPos += 24
  }

  // ── INSTRUCTIONS ─────────────────────────────────────────────────
  pdf.setFillColor(...lightGrey)
  pdf.rect(margin, yPos, contentWidth, 10, "F")
  pdf.setTextColor(...subColor)
  pdf.setFontSize(8)
  pdf.setFont("helvetica", "italic")
  pdf.text(
    includeAnswers
      ? "Answer Key: correct answers are highlighted in green with explanations."
      : "Instructions: Circle the correct answer for each question.",
    margin + 4, yPos + 6
  )
  yPos += 16

  // ── QUESTIONS BY SUBTOPIC ─────────────────────────────────────────
  for (const subtopicKey of Object.keys(questions)) {
    const subtopicData = questions[subtopicKey]
    if (!subtopicData) continue

    // Attach dimension tag so q.dimension is available for the badge
    const allQuestions = [
      ...(subtopicData.knowledge || []).map(q => q ? { ...q, dimension: "knowledge" } : null),
      ...(subtopicData.skills    || []).map(q => q ? { ...q, dimension: "skills"    } : null),
    ].filter(Boolean)

    if (allQuestions.length === 0) continue

    const subtopicLabel = subtopicKey
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase())

    // ── New page if needed ──────────────────────────────────────────
    if (yPos > pageHeight - 60) { pdf.addPage(); yPos = 20 }

    // ── Subtopic header band ────────────────────────────────────────
    pdf.setFillColor(...darkBlue)
    pdf.rect(margin, yPos, contentWidth, 8, "F")
    pdf.setTextColor(...white)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "bold")
    pdf.text(subtopicLabel, margin + 4, yPos + 5.5)
    yPos += 13

    // ── Individual questions ────────────────────────────────────────
    for (const q of allQuestions) {
      if (!q?.text) continue

      // Estimate space: question text + options + optional explanation
      const optionCount  = q.options?.length || 4
      const explLines    = includeAnswers && q.explanation
        ? pdf.splitTextToSize(`Explanation: ${q.explanation}`, contentWidth - 8).length
        : 0
      const neededSpace  = 18 + optionCount * 7 + explLines * 5 + 10

      if (yPos + neededSpace > pageHeight - 20) { pdf.addPage(); yPos = 20 }

      // ── Question text ─────────────────────────────────────────────
      pdf.setTextColor(...bodyColor)
      pdf.setFontSize(10)
      pdf.setFont("helvetica", "bold")
      const questionLines = pdf.splitTextToSize(
        `${questionNumber}. ${q.text}`,
        contentWidth
      )
      pdf.text(questionLines, margin, yPos)
      yPos += questionLines.length * 6 + 2

      // ── Dimension + level badge ───────────────────────────────────
      pdf.setTextColor(...subColor)
      pdf.setFontSize(7)
      pdf.setFont("helvetica", "italic")
      pdf.text(
        `[${q.dimension || "knowledge"} — ${q.level || "medium"}]`,
        margin + 4, yPos
      )
      yPos += 5

      // ── Options ───────────────────────────────────────────────────
      const optionLetters = ["A", "B", "C", "D"]
      const options = q.options || []

      for (let i = 0; i < options.length; i++) {
        if (yPos > pageHeight - 15) { pdf.addPage(); yPos = 20 }

        const letter    = optionLetters[i] || String(i + 1)
        const isCorrect = includeAnswers && options[i] === q.correct_answer

        if (isCorrect) {
          pdf.setTextColor(...green)
          pdf.setFont("helvetica", "bold")
        } else {
          pdf.setTextColor(...bodyColor)
          pdf.setFont("helvetica", "normal")
        }

        pdf.setFontSize(9)
        const optionLines = pdf.splitTextToSize(
          `   ${letter}. ${options[i]}`,
          contentWidth - 10
        )
        pdf.text(optionLines, margin + 4, yPos)
        yPos += optionLines.length * 5.5
      }

      // ── Explanation (answer key only) ─────────────────────────────
      if (includeAnswers && q.explanation) {
        if (yPos + 12 > pageHeight - 15) { pdf.addPage(); yPos = 20 }
        pdf.setTextColor(...subColor)
        pdf.setFontSize(7.5)
        pdf.setFont("helvetica", "italic")
        const expLines = pdf.splitTextToSize(
          `Explanation: ${q.explanation}`,
          contentWidth - 8
        )
        pdf.text(expLines, margin + 4, yPos + 2)
        yPos += expLines.length * 5 + 2
      }

      yPos += 8
      questionNumber++
    }

    yPos += 4
  }

  // ── FOOTER on every page ─────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)
    pdf.setDrawColor(...orange)
    pdf.setLineWidth(0.3)
    pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)
    pdf.setTextColor(...subColor)
    pdf.setFontSize(7)
    pdf.setFont("helvetica", "normal")
    pdf.text(
      `${schoolName} — ${unitInput?.chapter || "Assessment"}`,
      margin, pageHeight - 5
    )
    pdf.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin, pageHeight - 5,
      { align: "right" }
    )
  }

  // ── SAVE ─────────────────────────────────────────────────────────
  const safeName = (unitInput?.chapter || "Questions").replace(/\s+/g, "_")
  const suffix   = includeAnswers ? "Answer_Key" : "Question_Paper"
  pdf.save(`Assessment_${safeName}_${suffix}.pdf`)
}

function countTotalQuestions(questions) {
  let count = 0
  for (const key of Object.keys(questions)) {
    const d = questions[key]
    if (d) {
      count += (d.knowledge || []).filter(Boolean).length
      count += (d.skills    || []).filter(Boolean).length
    }
  }
  return count
}
