export function normalizeMerchant(input: string) {
  return input
    .toLowerCase()
    .replace(/@.*/, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
