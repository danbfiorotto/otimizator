/**
 * Utilitários para exportação de planos
 */

/**
 * Exporta o plano como imagem (PNG)
 */
export async function exportAsImage(elementId: string, filename: string = "plano.png"): Promise<void> {
  try {
    // Dynamic import para evitar problemas de SSR
    const html2canvas = (await import("html2canvas")).default
    
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    })

    const link = document.createElement("a")
    link.download = filename
    link.href = canvas.toDataURL("image/png")
    link.click()
  } catch (error) {
    console.error("Error exporting as image:", error)
    throw new Error("Não foi possível exportar como imagem. Certifique-se de que html2canvas está instalado.")
  }
}

/**
 * Exporta o plano como PDF
 */
export async function exportAsPDF(
  elementId: string,
  filename: string = "plano.pdf",
  title: string = "Plano do Dia"
): Promise<void> {
  try {
    // Dynamic imports
    const html2canvas = (await import("html2canvas")).default
    const { default: jsPDF } = await import("jspdf")

    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`)
    }

    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
    })

    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    // Add title
    pdf.setFontSize(16)
    pdf.text(title, 10, 10)
    position = 20

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - position

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10
      pdf.addPage()
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
  } catch (error) {
    console.error("Error exporting as PDF:", error)
    throw new Error("Não foi possível exportar como PDF. Certifique-se de que jspdf e html2canvas estão instalados.")
  }
}

/**
 * Exporta o plano como texto simples
 */
export function exportAsText(plan: {
  items: Array<{
    title: string
    startTimeLocal: string
    endTimeLocal?: string
    expectedWait?: number
    type: string
  }>
  parkHours?: { open: string; close: string }
  metrics?: {
    totalPlannedRides: number
    totalExpectedWait: number
  }
}, filename: string = "plano.txt"): void {
  let content = "PLANO DO DIA\n"
  content += "=".repeat(50) + "\n\n"

  if (plan.parkHours) {
    content += `Horário do Parque: ${plan.parkHours.open} - ${plan.parkHours.close}\n\n`
  }

  content += "ITINERÁRIO:\n"
  content += "-".repeat(50) + "\n"

  plan.items.forEach((item, index) => {
    content += `${index + 1}. ${item.title}\n`
    content += `   Horário: ${item.startTimeLocal}`
    if (item.endTimeLocal) {
      content += ` - ${item.endTimeLocal}`
    }
    content += `\n`
    if (item.expectedWait) {
      content += `   Tempo de fila esperado: ${item.expectedWait} minutos\n`
    }
    content += `   Tipo: ${item.type}\n\n`
  })

  if (plan.metrics) {
    content += "\n" + "=".repeat(50) + "\n"
    content += "RESUMO:\n"
    content += `Total de atrações planejadas: ${plan.metrics.totalPlannedRides}\n`
    content += `Tempo total esperado em filas: ${plan.metrics.totalExpectedWait} minutos\n`
  }

  const blob = new Blob([content], { type: "text/plain" })
  const link = document.createElement("a")
  link.download = filename
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}
