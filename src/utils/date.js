import { dateKey, addDays, getToday } from '../constants.js'

export function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return dateKey(d)
}

export function labelForDate(d) {
  const k = dateKey(d)
  const todayK = dateKey(getToday())
  if (k === todayK) return '오늘'
  if (k === dateKey(addDays(getToday(), -1))) return '어제'
  if (k === dateKey(addDays(getToday(),  1))) return '내일'
  return null
}
