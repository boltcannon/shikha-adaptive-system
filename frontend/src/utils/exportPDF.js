import jsPDF from "jspdf"

/**
 * Exports a completed RAC Data Report artifact to a styled PDF.
 *
 * @param {object} artifact     — { report_title, project_idea, sections: [{title, content}] }
 * @param {string} studentName  — display name shown in header
 * @param {object} unitInput    — { grade, subject, chapter, context }
 */
export async function exportReportAsPDF(artifact, studentName, unitInput) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit       : "mm",
    format     : "a4",
  })

  const pageWidth    = 210
  const pageHeight   = 297
  const margin       = 20
  const contentWidth = pageWidth - margin * 2

  // ── Palette ─────────────────────────────────────────────────────
  const darkBlue  = [26,  82,  118]
  const orange    = [232, 119, 34]
  const white     = [255, 255, 255]
  const lightGrey = [242, 243, 244]
  const bodyColor = [44,  62,  80]
  const subColor  = [93,  109, 126]

  let yPos = 0

  // ── HEADER ──────────────────────────────────────────────────────
  pdf.setFillColor(...darkBlue)
  pdf.rect(0, 0, pageWidth, 45, "F")

  // Orange accent line under header
  pdf.setFillColor(...orange)
  pdf.rect(0, 43, pageWidth, 2, "F")

  // "SHIKHA ACADEMY" label
  pdf.setTextColor(...orange)
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "bold")
  pdf.text("SHIKHA ACADEMY", margin, 14)

  // Report title (may wrap)
  pdf.setTextColor(...white)
  pdf.setFontSize(18)
  pdf.setFont("helvetica", "bold")
  const title      = artifact.report_title || "Data Report"
  const titleLines = pdf.splitTextToSize(title, contentWidth)
  pdf.text(titleLines, margin, 26)

  // Student name · grade · subject · chapter
  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(200, 220, 240)
  const subtitle = [
    studentName             || "Student",
    unitInput?.grade        || "",
    unitInput?.subject      || "",
    unitInput?.chapter      || "",
  ].filter(Boolean).join("  ·  ")
  pdf.text(subtitle, margin, 38)

  yPos = 55

  // ── PROJECT IDEA PILL ────────────────────────────────────────────
  if (artifact.project_idea) {
    pdf.setFillColor(...lightGrey)
    pdf.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "F")

    pdf.setTextColor(...subColor)
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "bold")
    pdf.text("PROJECT IDEA", margin + 4, yPos + 5)

    pdf.setTextColor(...bodyColor)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    const ideaLines = pdf.splitTextToSize(artifact.project_idea, contentWidth - 8)
    // Show just the first line in the pill; full idea is implicit from sections
    pdf.text(ideaLines[0], margin + 4, yPos + 11)

    yPos += 22
  }

  // ── SECTIONS ────────────────────────────────────────────────────
  const sections = artifact.sections || []

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]

    if (yPos > pageHeight - 60) {
      pdf.addPage()
      yPos = 20
    }

    // Numbered orange circle badge
    pdf.setFillColor(...orange)
    pdf.circle(margin + 4, yPos + 4, 4, "F")
    pdf.setTextColor(...white)
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "bold")
    pdf.text(String(i + 1), margin + (i < 9 ? 2.5 : 1.5), yPos + 6.5)

    // Section title
    pdf.setTextColor(...darkBlue)
    pdf.setFontSize(13)
    pdf.setFont("helvetica", "bold")
    pdf.text(section.title || `Section ${i + 1}`, margin + 12, yPos + 7)

    // Thin orange rule under section heading
    pdf.setDrawColor(...orange)
    pdf.setLineWidth(0.5)
    pdf.line(margin, yPos + 10, margin + contentWidth, yPos + 10)

    yPos += 16

    // Body text
    const content      = section.content || "(No content written)"
    const contentLines = pdf.splitTextToSize(content, contentWidth)

    pdf.setTextColor(...bodyColor)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.setLineHeightFactor(1.6)

    for (const line of contentLines) {
      if (yPos > pageHeight - 25) {
        pdf.addPage()
        yPos = 20
      }
      pdf.text(line, margin, yPos)
      yPos += 6
    }

    yPos += 10
  }

  // ── FOOTER on every page ─────────────────────────────────────────
  const totalPages = pdf.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p)

    pdf.setDrawColor(...orange)
    pdf.setLineWidth(0.3)
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)

    pdf.setTextColor(...subColor)
    pdf.setFontSize(7)
    pdf.setFont("helvetica", "normal")
    pdf.text(
      "Shikha Academy — Adaptive Learning Framework",
      margin,
      pageHeight - 7,
    )
    pdf.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" },
    )
  }

  // ── SAVE ─────────────────────────────────────────────────────────
  const safeName  = (artifact.report_title || "Data_Report")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
  const safeStudent = (studentName || "Student").replace(/\s+/g, "_")
  pdf.save(`${safeName}_${safeStudent}.pdf`)
}
