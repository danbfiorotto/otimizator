import { format, parse, addMinutes, differenceInMinutes, isBefore, isAfter } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

/**
 * Converte um time string (HH:mm) para Date no timezone especificado
 * Implementação simplificada usando apenas formatInTimeZone
 */
export function timeStringToDate(
  timeString: string,
  date: Date,
  timezone: string
): Date {
  const [hours, minutes] = timeString.split(":").map(Number)
  const dateStr = format(date, "yyyy-MM-dd")
  
  // Cria uma data local assumindo o horário fornecido
  const localDate = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`)
  
  // Obtém o que essa data seria no timezone alvo
  const targetTimeStr = formatInTimeZone(localDate, timezone, "HH:mm")
  const [targetHours, targetMinutes] = targetTimeStr.split(":").map(Number)
  
  // Calcula a diferença de offset
  const hourDiff = hours - targetHours
  const minuteDiff = minutes - targetMinutes
  const offsetMs = (hourDiff * 60 + minuteDiff) * 60000
  
  // Retorna a data ajustada pelo offset
  return new Date(localDate.getTime() - offsetMs)
}

/**
 * Formata um Date para time string (HH:mm) no timezone especificado
 */
export function dateToTimeString(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "HH:mm")
}

/**
 * Adiciona minutos a um time string
 */
export function addMinutesToTime(timeString: string, minutes: number): string {
  const [hours, mins] = timeString.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, mins, 0, 0)
  const newDate = addMinutes(date, minutes)
  return format(newDate, "HH:mm")
}

/**
 * Calcula diferença em minutos entre dois time strings
 */
export function timeDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(":").map(Number)
  const [h2, m2] = time2.split(":").map(Number)
  const date1 = new Date()
  date1.setHours(h1, m1, 0, 0)
  const date2 = new Date()
  date2.setHours(h2, m2, 0, 0)
  return differenceInMinutes(date2, date1)
}

/**
 * Verifica se time1 é antes de time2
 */
export function isTimeBefore(time1: string, time2: string): boolean {
  const [h1, m1] = time1.split(":").map(Number)
  const [h2, m2] = time2.split(":").map(Number)
  const date1 = new Date()
  date1.setHours(h1, m1, 0, 0)
  const date2 = new Date()
  date2.setHours(h2, m2, 0, 0)
  return isBefore(date1, date2)
}

/**
 * Verifica se time1 é depois de time2
 */
export function isTimeAfter(time1: string, time2: string): boolean {
  const [h1, m1] = time1.split(":").map(Number)
  const [h2, m2] = time2.split(":").map(Number)
  const date1 = new Date()
  date1.setHours(h1, m1, 0, 0)
  const date2 = new Date()
  date2.setHours(h2, m2, 0, 0)
  return isAfter(date1, date2)
}

/**
 * Formata data para YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/**
 * Parse YYYY-MM-DD para Date
 */
export function parseDate(dateString: string): Date {
  return parse(dateString, "yyyy-MM-dd", new Date())
}

/**
 * Obtém dia da semana (0=Sunday, 6=Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

/**
 * Obtém mês (1-12)
 */
export function getMonth(date: Date): number {
  return date.getMonth() + 1
}
