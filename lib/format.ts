/** 1500000 -> "1.500.000đ" — luôn số nguyên đồng, không khoảng trắng trước đ. */
export function formatVnd(
  amount: number,
  opts?: { sign?: boolean; unit?: boolean },
) {
  const sign = opts?.sign ? (amount > 0 ? '+' : amount < 0 ? '−' : '') : ''
  const body = new Intl.NumberFormat('vi-VN').format(Math.abs(Math.round(amount)))
  return `${sign}${body}${opts?.unit === false ? '' : 'đ'}`
}

/** 16180000 -> "16,18tr" cho chỗ hẹp (ô donut, thẻ mobile). */
export function formatVndShort(amount: number) {
  const a = Math.abs(amount)
  if (a >= 1_000_000)
    return `${(a / 1_000_000).toFixed(a >= 10_000_000 ? 2 : 1).replace('.', ',')}tr`
  if (a >= 1_000) return `${Math.round(a / 1_000)}k`
  return String(a)
}

/**
 * Parse chuỗi người dùng gõ thành số nguyên đồng.
 *  "300k" -> 300000 · "1.5tr" = "1,5tr" -> 1500000 · "1.500.000" -> 1500000
 * Không parse được -> null (KHÔNG hiện lỗi đỏ, người dùng đang gõ dở).
 */
export function parseAmountVnd(raw: string): number | null {
  const s = raw.toLowerCase().replace(/\s|đ|vnd/g, '')
  if (!s) return null

  const m = s.match(/^([\d.,]+)(k|ngàn|nghìn|tr|triệu|m)?$/)
  if (!m) return null

  const [, digits, unit] = m
  let n: number

  if (unit) {
    // có hậu tố: . và , đều là dấu thập phân
    n = Number(digits.replace(/,/g, '.'))
    if (Number.isNaN(n)) return null
    n *= unit === 'k' || unit === 'ngàn' || unit === 'nghìn' ? 1_000 : 1_000_000
  } else {
    // không hậu tố: . và , là dấu phân cách nghìn
    n = Number(digits.replace(/[.,]/g, ''))
    if (Number.isNaN(n)) return null
  }

  const rounded = Math.round(n)
  return rounded > 0 ? rounded : null
}

/** Nhãn nhóm ngày: "Hôm nay" · "Hôm qua" · "Thứ Bảy · 29/8" */
export function formatDayLabel(iso: string, now = new Date()) {
  const d = new Date(iso)
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (day(d) === day(now)) return 'Hôm nay'
  if (day(d) === day(yesterday)) return 'Hôm qua'
  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' })
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} · ${d.getDate()}/${d.getMonth() + 1}`
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** "2026-09" -> "Tháng 9, 2026" */
export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-')
  return `Tháng ${Number(month)}, ${year}`
}

/**
 * Số ngày còn lại của tháng, tính từ hôm nay. Tháng đã qua hoặc chưa tới thì
 * trả về độ dài cả tháng. Luôn ≥ 1 để không chia cho 0 khi tính nhịp chi.
 */
export function daysLeftInMonth(monthKey: string, now = new Date()) {
  const [year, month] = monthKey.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month
  return Math.max(1, isCurrent ? lastDay - now.getDate() : lastDay)
}

/** Ngày local dạng "YYYY-MM-DD" — cho <input type="date">. */
export function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** "2026-09" + (-1) -> "2026-08". Dịch tháng, tự cuộn qua năm. */
export function shiftMonth(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-09" -> "T9" — nhãn ngắn cho pill mobile. */
export function formatMonthShort(monthKey: string) {
  return `T${Number(monthKey.split('-')[1])}`
}
