const IST_OFFSET_MINUTES = 330

function istCalendarFromUtcNow(now = new Date()) {
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000
  const istNow = new Date(utcMillis + IST_OFFSET_MINUTES * 60_000)
  return {
    year: istNow.getUTCFullYear(),
    month: istNow.getUTCMonth(),
    day: istNow.getUTCDate(),
  }
}

export function getIstMidnightEpochSecondsForCalendarDate(year: number, monthIndex: number, day: number) {
  const istMidnightMillis = Date.UTC(year, monthIndex, day, 0, 0, 0, 0)
  const cutoffUtcMillis = istMidnightMillis - IST_OFFSET_MINUTES * 60_000
  return Math.floor(cutoffUtcMillis / 1000)
}

export function getIstMidnightCutoffEpochSeconds(daysBack: number, now = new Date()) {
  const { year, month, day } = istCalendarFromUtcNow(now)
  const todayMidnight = getIstMidnightEpochSecondsForCalendarDate(year, month, day)
  return todayMidnight - daysBack * 24 * 60 * 60
}

export function getIstMidnightEpochSecondsForYmd(ymd: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) throw new Error('Invalid date format')
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, monthIndex, day))
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== monthIndex ||
    probe.getUTCDate() !== day
  ) {
    throw new Error('Invalid date')
  }
  return getIstMidnightEpochSecondsForCalendarDate(year, monthIndex, day)
}

export function getTodayYmdInIst(now = new Date()) {
  const { year, month, day } = istCalendarFromUtcNow(now)
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

const DEFAULT_FETCH_DAYS_BACK = 3
const DEFAULT_FETCH_MAX_RESULTS = 25

function getPositiveIntEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export function getDefaultFetchDaysBack() {
  return getPositiveIntEnv('GMAIL_FETCH_DAYS_BACK', DEFAULT_FETCH_DAYS_BACK)
}

export function getDefaultFetchMaxResults() {
  return getPositiveIntEnv('GMAIL_FETCH_MAX_RESULTS', DEFAULT_FETCH_MAX_RESULTS)
}
