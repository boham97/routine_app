export const MONTHS  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
export const DAYS    = ['일','월','화','수','목','금','토']
export const PALETTE = ['#ff9500','#007aff','#34c759','#ff3b30','#af52de','#5ac8fa','#ff2d55','#a2845e']
export const UNITS   = ['회','초','분','km']

export function dateKey(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
export function getToday() { const d = new Date(); d.setHours(0,0,0,0); return d }
export function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
