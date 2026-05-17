/** Returns link code from /start or /start@BotName <code>; null if /start only; undefined if not a start command. */
export function parseStartLinkCode(text: string): string | null | undefined {
  const match = text.trim().match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(.+))?$/i)
  if (!match) return undefined
  const payload = match[1]?.trim()
  return payload ? payload : null
}
