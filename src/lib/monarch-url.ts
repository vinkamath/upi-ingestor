export function toTransactionYmd(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function buildMonarchTransactionsUrl(
  accountId: string,
  startDate: string,
  endDate: string
) {
  const url = new URL('https://app.monarch.com/transactions')
  url.searchParams.set('accounts', accountId)
  url.searchParams.set('startDate', startDate)
  url.searchParams.set('endDate', endDate)
  return url.toString()
}
