'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CircleCheck,
  CircleDashed,
  Mail,
  Landmark,
  MessageSquare,
  ListOrdered,
  ChevronUp,
  ChevronDown,
  X,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DEFAULT_PINNED_CATEGORY_NAMES, DEFAULT_NO_REMEMBER_TAGS } from '@/lib/monarch-categories'

type MonarchCategoryOption = { id: string; name: string }

const styledSelect =
  'h-8 w-full rounded-lg border border-border bg-background text-[13px] text-foreground px-2 pr-7 focus:outline-none focus:ring-2 focus:ring-ring appearance-none'
const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-[12px] font-medium',
        connected ? 'text-positive' : 'text-muted-foreground'
      )}
    >
      {connected ? (
        <CircleCheck className="h-3.5 w-3.5" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5" />
      )}
      {connected ? 'Connected' : 'Not connected'}
    </span>
  )
}

export default function SettingsPage() {
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean
    emailAddress: string | null
    lastUpdatedAt: string | null
    fetchSinceDate: string | null
    defaultFetchDaysBack: number
    fetchMaxResults: number
    appPasswordConfigured: boolean
  } | null>(null)
  const [gmailAppPassword, setGmailAppPassword] = useState('')
  const [isSavingAppPassword, setIsSavingAppPassword] = useState(false)
  const [appPasswordMessage, setAppPasswordMessage] = useState<string | null>(null)
  const [gmailFetchSinceDate, setGmailFetchSinceDate] = useState('')
  const [isSavingGmailFetch, setIsSavingGmailFetch] = useState(false)
  const [gmailFetchMessage, setGmailFetchMessage] = useState<string | null>(null)
  const [monarch, setMonarch] = useState({ email: '', credential: '', defaultAccountId: '' })
  const [monarchStatus, setMonarchStatus] = useState<{
    connected: boolean
    email: string | null
    defaultAccountId: string | null
    lastUpdatedAt: string | null
  } | null>(null)
  const [monarchAccounts, setMonarchAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [isSavingMonarch, setIsSavingMonarch] = useState(false)
  const [monarchMessage, setMonarchMessage] = useState<string | null>(null)
  const [telegramCode, setTelegramCode] = useState<string | null>(null)
  const [telegramLinkCopied, setTelegramLinkCopied] = useState(false)
  const telegramLinkCopiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [telegramStatus, setTelegramStatus] = useState<{
    linked: boolean
    linkedAt: string | null
  } | null>(null)
  const [telegramTestChatId, setTelegramTestChatId] = useState('')
  const [telegramTestMessage, setTelegramTestMessage] = useState<string | null>(null)
  const [isSendingTelegramTest, setIsSendingTelegramTest] = useState(false)
  const [monarchCategories, setMonarchCategories] = useState<MonarchCategoryOption[]>([])
  const [pinnedCategoryNames, setPinnedCategoryNames] = useState<string[]>([])
  const [addCategoryName, setAddCategoryName] = useState('')
  const [isSavingPinned, setIsSavingPinned] = useState(false)
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null)
  const [noRememberTags, setNoRememberTags] = useState<string[]>([])
  const [addNoRememberTag, setAddNoRememberTag] = useState('')
  const [isSavingNoRemember, setIsSavingNoRemember] = useState(false)
  const [noRememberMessage, setNoRememberMessage] = useState<string | null>(null)

  async function loadGmailStatus() {
    const res = await fetch('/api/connect/gmail/status')
    const json = await res.json()
    if (!res.ok) {
      setGmailFetchMessage(`Failed to load Gmail settings: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setGmailStatus(json)
    setGmailFetchSinceDate(json.fetchSinceDate ?? '')
  }

  async function saveGmailAppPassword() {
    setAppPasswordMessage(null)
    setIsSavingAppPassword(true)
    const res = await fetch('/api/connect/gmail/app-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPassword: gmailAppPassword }),
    })
    const json = await res.json().catch(() => null)
    setIsSavingAppPassword(false)
    if (!res.ok) {
      setAppPasswordMessage(`Failed to save: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setGmailAppPassword('')
    setAppPasswordMessage('App password verified and saved. Gmail fetches now use IMAP.')
    await loadGmailStatus()
  }

  async function removeGmailAppPassword() {
    setAppPasswordMessage(null)
    setIsSavingAppPassword(true)
    const res = await fetch('/api/connect/gmail/app-password', { method: 'DELETE' })
    const json = await res.json().catch(() => null)
    setIsSavingAppPassword(false)
    if (!res.ok) {
      setAppPasswordMessage(`Failed to remove: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setAppPasswordMessage('App password removed. Gmail fetches fall back to Google sign-in (expires every 7 days).')
    await loadGmailStatus()
  }

  async function saveGmailFetchSinceDate(fetchSinceDate: string | null) {
    setGmailFetchMessage(null)
    setIsSavingGmailFetch(true)
    const res = await fetch('/api/connect/gmail/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fetchSinceDate }),
    })
    const json = await res.json()
    setIsSavingGmailFetch(false)

    if (!res.ok) {
      setGmailFetchMessage(`Failed to save: ${json?.error ?? 'Unknown error'}`)
      return
    }

    setGmailFetchSinceDate(json.fetchSinceDate ?? '')
    setGmailFetchMessage(
      json.fetchSinceDate
        ? `Imports will start from ${json.fetchSinceDate} (IST).`
        : `Using default: last ${json.defaultFetchDaysBack} day(s).`
    )
    await loadGmailStatus()
  }

  async function saveMonarch() {
    setMonarchMessage(null)
    setIsSavingMonarch(true)
    const res = await fetch('/api/connect/monarch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monarch),
    })
    const json = await res.json()
    setIsSavingMonarch(false)

    if (!res.ok) {
      setMonarchMessage(`Failed to save: ${json?.error ?? 'Unknown error'}`)
      return
    }

    const accounts = (json?.accounts ?? []) as Array<{ id: string; name: string }>
    setMonarchAccounts(accounts)
    if (accounts.length > 0) {
      const selected =
        (json?.selectedDefaultAccountId as string | null) ?? (monarch.defaultAccountId || accounts[0].id)
      setMonarch((s) => ({ ...s, defaultAccountId: selected }))
    }

    setMonarchMessage(
      `Connection saved${json?.accountCount ? ` — ${json.accountCount} account(s) found` : ''}. Select a default account and save again if needed.`
    )
    await loadMonarchStatus()
  }

  async function loadMonarchStatus() {
    const res = await fetch('/api/connect/monarch')
    const json = await res.json()
    if (!res.ok) {
      setMonarchMessage(`Failed to load status: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setMonarchStatus(json)
    const accounts = (json?.accounts ?? []) as Array<{ id: string; name: string }>
    setMonarchAccounts(accounts)
    setMonarch((s) => ({
      ...s,
      email: json?.email ?? '',
      defaultAccountId: (json?.defaultAccountId as string | null) ?? '',
    }))
  }

  async function loadTelegramStatus() {
    const res = await fetch('/api/connect/telegram')
    const json = await res.json()
    if (!res.ok) {
      setTelegramTestMessage(`Failed to load status: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setTelegramStatus(json)
  }

  async function createTelegramLink() {
    const res = await fetch('/api/connect/telegram', { method: 'POST' })
    const json = await res.json()
    setTelegramCode(json.linkCode)
    setTelegramLinkCopied(false)
    await loadTelegramStatus()
  }

  async function copyTelegramStartCommand() {
    if (!telegramCode) return
    const command = `/start ${telegramCode}`
    try {
      await navigator.clipboard.writeText(command)
      setTelegramLinkCopied(true)
      if (telegramLinkCopiedTimeoutRef.current) {
        clearTimeout(telegramLinkCopiedTimeoutRef.current)
      }
      telegramLinkCopiedTimeoutRef.current = setTimeout(() => {
        setTelegramLinkCopied(false)
        telegramLinkCopiedTimeoutRef.current = null
      }, 2000)
    } catch {
      setTelegramTestMessage('Could not copy — select the command and copy manually.')
    }
  }

  async function sendTelegramTest() {
    setTelegramTestMessage(null)
    setIsSendingTelegramTest(true)
    const res = await fetch('/api/connect/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(telegramTestChatId.trim() ? { chatId: telegramTestChatId.trim() } : {}),
      }),
    })
    const json = await res.json()
    setIsSendingTelegramTest(false)

    if (!res.ok) {
      setTelegramTestMessage(json?.error ?? 'Failed to send test message')
      return
    }

    setTelegramTestMessage('Test message sent — check your Telegram bot chat.')
  }

  async function loadMonarchCategories() {
    const res = await fetch('/api/connect/monarch/categories')
    const json = await res.json()
    if (!res.ok) return
    setMonarchCategories((json?.categories ?? []) as MonarchCategoryOption[])
  }

  async function loadPinnedCategories() {
    const res = await fetch('/api/settings/preferences')
    const json = await res.json()
    if (!res.ok) {
      setPinnedMessage(json?.error ?? 'Failed to load quick categories')
      return
    }
    const names = json?.pinnedCategoryNames
    if (Array.isArray(names)) {
      setPinnedCategoryNames(names.filter((n: unknown) => typeof n === 'string'))
    }
    const tags = json?.noRememberTags
    if (Array.isArray(tags)) {
      setNoRememberTags(tags.filter((n: unknown) => typeof n === 'string'))
    }
  }

  async function savePinnedCategories() {
    setPinnedMessage(null)
    setIsSavingPinned(true)
    const res = await fetch('/api/settings/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinnedCategoryNames }),
    })
    const json = await res.json()
    setIsSavingPinned(false)
    if (!res.ok) {
      setPinnedMessage(`Failed to save: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setPinnedMessage('Quick categories saved.')
  }

  function addPinnedCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const exists = pinnedCategoryNames.some(
      (n) => n.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0
    )
    if (exists) return
    setPinnedCategoryNames((prev) => [...prev, trimmed])
    setAddCategoryName('')
  }

  function removePinnedCategory(index: number) {
    setPinnedCategoryNames((prev) => prev.filter((_, i) => i !== index))
  }

  function movePinnedCategory(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= pinnedCategoryNames.length) return
    setPinnedCategoryNames((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  function resetPinnedToDefaults() {
    setPinnedCategoryNames([...DEFAULT_PINNED_CATEGORY_NAMES])
  }

  async function saveNoRememberTags() {
    setNoRememberMessage(null)
    setIsSavingNoRemember(true)
    const res = await fetch('/api/settings/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noRememberTags }),
    })
    const json = await res.json()
    setIsSavingNoRemember(false)
    if (!res.ok) {
      setNoRememberMessage(`Failed to save: ${json?.error ?? 'Unknown error'}`)
      return
    }
    setNoRememberMessage('No-remember tags saved.')
  }

  function addNoRememberTagItem(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const exists = noRememberTags.some(
      (n) => n.localeCompare(trimmed, undefined, { sensitivity: 'accent' }) === 0
    )
    if (exists) return
    setNoRememberTags((prev) => [...prev, trimmed])
    setAddNoRememberTag('')
  }

  function removeNoRememberTag(index: number) {
    setNoRememberTags((prev) => prev.filter((_, i) => i !== index))
  }

  function resetNoRememberToDefaults() {
    setNoRememberTags([...DEFAULT_NO_REMEMBER_TAGS])
  }

  const availableToPin = monarchCategories.filter(
    (c) =>
      !pinnedCategoryNames.some(
        (n) => n.localeCompare(c.name, undefined, { sensitivity: 'accent' }) === 0
      )
  )

  const availableToTag = monarchCategories.filter(
    (c) =>
      !noRememberTags.some(
        (n) => n.localeCompare(c.name, undefined, { sensitivity: 'accent' }) === 0
      )
  )

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadGmailStatus()
      void loadMonarchStatus()
      void loadMonarchCategories()
      void loadPinnedCategories()
      void loadTelegramStatus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    return () => {
      if (telegramLinkCopiedTimeoutRef.current) {
        clearTimeout(telegramLinkCopiedTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-[28px] leading-tight tracking-[-0.5px] text-foreground">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Connections, quick categories, and notifications.
        </p>
      </div>

      {/* Gmail */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-[15px]">Gmail</CardTitle>
                <CardDescription className="text-[12px]">
                  {gmailStatus?.emailAddress ?? 'Connect your Gmail account'}
                </CardDescription>
              </div>
            </div>
            <ConnectionStatus connected={gmailStatus?.connected ?? false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant={gmailStatus?.connected ? 'outline' : 'default'} size="sm">
            <a href="/api/auth/google?next=/settings">
              {gmailStatus?.connected ? 'Reconnect Gmail' : 'Connect with Google'}
            </a>
          </Button>
          <div className="space-y-1.5 pt-3 border-t border-border">
            <Label htmlFor="gmail-app-password" className="text-[12px]">
              Gmail app password (IMAP)
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="gmail-app-password"
                type="password"
                autoComplete="off"
                placeholder={gmailStatus?.appPasswordConfigured ? '•••• saved — paste to replace' : 'xxxx xxxx xxxx xxxx'}
                className="h-8 text-[13px] max-w-[260px]"
                value={gmailAppPassword}
                disabled={!gmailStatus?.connected || isSavingAppPassword}
                onChange={(e) => setGmailAppPassword(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={!gmailStatus?.connected || isSavingAppPassword || !gmailAppPassword.trim()}
                onClick={() => void saveGmailAppPassword()}
              >
                {isSavingAppPassword ? 'Checking…' : 'Save'}
              </Button>
              {gmailStatus?.appPasswordConfigured ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSavingAppPassword}
                  onClick={() => void removeGmailAppPassword()}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {gmailStatus?.appPasswordConfigured
                ? 'Fetching over IMAP with your app password. It does not expire unless you revoke it or change your Google password.'
                : 'Google sign-in tokens expire every 7 days while the Google app is unpublished. Create an app password at myaccount.google.com/apppasswords (needs 2-Step Verification) and paste it here to stop re-authorizing.'}
            </p>
            {appPasswordMessage ? (
              <p className="text-[12px] text-muted-foreground">{appPasswordMessage}</p>
            ) : null}
          </div>
          <div className="space-y-3 pt-3 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="gmail-fetch-since" className="text-[12px]">
                  Earliest import date
                </Label>
                <Input
                  id="gmail-fetch-since"
                  type="date"
                  className="h-8 text-[13px] max-w-[220px]"
                  value={gmailFetchSinceDate}
                  disabled={!gmailStatus?.connected || isSavingGmailFetch}
                  onChange={(e) => setGmailFetchSinceDate(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {!gmailStatus?.connected
                    ? 'Connect Gmail above to set how far back imports should go.'
                    : gmailStatus.fetchSinceDate
                      ? `Currently importing from ${gmailStatus.fetchSinceDate} onward (IST midnight). Up to ${gmailStatus.fetchMaxResults ?? 25} messages per run.`
                      : `Leave empty to use the server default: last ${gmailStatus.defaultFetchDaysBack ?? 3} day(s). Up to ${gmailStatus.fetchMaxResults ?? 25} messages per run.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!gmailStatus?.connected || isSavingGmailFetch}
                  onClick={() =>
                    void saveGmailFetchSinceDate(gmailFetchSinceDate.trim() ? gmailFetchSinceDate : null)
                  }
                >
                  {isSavingGmailFetch ? 'Saving…' : 'Save import range'}
                </Button>
                {gmailStatus?.connected && gmailStatus.fetchSinceDate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSavingGmailFetch}
                    onClick={() => void saveGmailFetchSinceDate(null)}
                  >
                    Use default window
                  </Button>
                ) : null}
              </div>
            {gmailFetchMessage ? (
              <p className="text-[12px] text-muted-foreground">{gmailFetchMessage}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Monarch */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-[15px]">Monarch Money</CardTitle>
                <CardDescription className="text-[12px]">
                  {monarchStatus?.email ?? 'Add your Monarch credentials'}
                </CardDescription>
              </div>
            </div>
            <ConnectionStatus connected={monarchStatus?.connected ?? false} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="monarch-email" className="text-[12px]">Email</Label>
            <Input
              id="monarch-email"
              placeholder="you@email.com"
              className="h-8 text-[13px]"
              value={monarch.email}
              onChange={(e) => setMonarch((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monarch-token" className="text-[12px]">Token / Credential</Label>
            <Input
              id="monarch-token"
              type="password"
              placeholder="••••••••"
              className="h-8 text-[13px]"
              value={monarch.credential}
              onChange={(e) => setMonarch((s) => ({ ...s, credential: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monarch-account" className="text-[12px]">Default Account</Label>
            {monarchAccounts.length > 0 ? (
              <select
                id="monarch-account"
                className="h-8 w-full rounded-lg border border-border bg-background text-[13px] text-foreground px-2 pr-7 focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                value={monarch.defaultAccountId}
                onChange={(e) => setMonarch((s) => ({ ...s, defaultAccountId: e.target.value }))}
              >
                {monarchAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="monarch-account"
                placeholder="Account ID"
                className="h-8 text-[13px]"
                value={monarch.defaultAccountId}
                onChange={(e) => setMonarch((s) => ({ ...s, defaultAccountId: e.target.value }))}
              />
            )}
          </div>
          <Button
            onClick={saveMonarch}
            disabled={isSavingMonarch}
            size="sm"
            className="w-full"
          >
            {isSavingMonarch ? 'Saving…' : 'Save Monarch connection'}
          </Button>
          {monarchMessage && (
            <p className="text-[12px] text-muted-foreground">{monarchMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* Quick categories */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <ListOrdered className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-[15px]">Quick categories</CardTitle>
              <CardDescription className="text-[12px]">
                Pin categories to the top of transaction dropdowns, in this order.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {monarchCategories.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Connect Monarch Money to load categories.
            </p>
          ) : (
            <>
              {pinnedCategoryNames.length > 0 ? (
                <ul className="space-y-1.5">
                  {pinnedCategoryNames.map((name, index) => (
                    <li
                      key={`${name}-${index}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2 py-1.5"
                    >
                      <span className="flex-1 text-[13px] text-foreground truncate">{name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={index === 0}
                        onClick={() => movePinnedCategory(index, -1)}
                        aria-label={`Move ${name} up`}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={index === pinnedCategoryNames.length - 1}
                        onClick={() => movePinnedCategory(index, 1)}
                        aria-label={`Move ${name} down`}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removePinnedCategory(index)}
                        aria-label={`Remove ${name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">No quick categories selected.</p>
              )}

              {availableToPin.length > 0 && (
                <div className="flex gap-2">
                  <select
                    className={cn(styledSelect, 'flex-1')}
                    style={selectStyle}
                    value={addCategoryName}
                    onChange={(e) => setAddCategoryName(e.target.value)}
                  >
                    <option value="">Add category…</option>
                    {availableToPin.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={!addCategoryName}
                    onClick={() => addPinnedCategory(addCategoryName)}
                  >
                    Add
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={savePinnedCategories}
              disabled={isSavingPinned}
              size="sm"
              className="flex-1 min-w-[120px]"
            >
              {isSavingPinned ? 'Saving…' : 'Save quick categories'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetPinnedToDefaults}
              disabled={isSavingPinned}
            >
              Reset defaults
            </Button>
          </div>
          {pinnedMessage && (
            <p className="text-[12px] text-muted-foreground">{pinnedMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* No-remember merchant tags */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <X className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-[15px]">No-remember merchant tags</CardTitle>
              <CardDescription className="text-[12px]">
                Merchants in these categories won&apos;t be auto-mapped for future transactions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {monarchCategories.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Connect Monarch Money to load categories.
            </p>
          ) : (
            <>
              {noRememberTags.length > 0 ? (
                <ul className="space-y-1.5">
                  {noRememberTags.map((name, index) => (
                    <li
                      key={`${name}-${index}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2 py-1.5"
                    >
                      <span className="flex-1 text-[13px] text-foreground truncate">{name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeNoRememberTag(index)}
                        aria-label={`Remove ${name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-muted-foreground">No tags selected.</p>
              )}

              {availableToTag.length > 0 && (
                <div className="flex gap-2">
                  <select
                    className={cn(styledSelect, 'flex-1')}
                    style={selectStyle}
                    value={addNoRememberTag}
                    onChange={(e) => setAddNoRememberTag(e.target.value)}
                  >
                    <option value="">Add category…</option>
                    {availableToTag.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={!addNoRememberTag}
                    onClick={() => addNoRememberTagItem(addNoRememberTag)}
                  >
                    Add
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={saveNoRememberTags}
              disabled={isSavingNoRemember}
              size="sm"
              className="flex-1 min-w-[120px]"
            >
              {isSavingNoRemember ? 'Saving…' : 'Save tags'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetNoRememberToDefaults}
              disabled={isSavingNoRemember}
            >
              Reset defaults
            </Button>
          </div>
          {noRememberMessage && (
            <p className="text-[12px] text-muted-foreground">{noRememberMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-[15px]">Telegram</CardTitle>
                <CardDescription className="text-[12px]">
                  Get transaction notifications via Telegram bot
                </CardDescription>
              </div>
            </div>
            {telegramStatus && (
              <ConnectionStatus connected={telegramStatus.linked} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={createTelegramLink}>
            Generate link code
          </Button>
          {telegramCode && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 rounded-lg bg-muted pl-3 pr-1 py-1.5">
                <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground">
                  /start {telegramCode}
                </code>
                <button
                  type="button"
                  onClick={() => void copyTelegramStartCommand()}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] transition-colors',
                    telegramLinkCopied
                      ? 'text-positive'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                  aria-label={telegramLinkCopied ? 'Copied to clipboard' : 'Copy command to clipboard'}
                >
                  {telegramLinkCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      <span>Copied</span>
                    </>
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Paste this in your bot chat. The bot should reply within a few seconds — if it stays
                silent, the Telegram webhook is not reaching this app (localhost won&apos;t work; use a
                deployed URL or ngrok).
              </p>
              <p className="sr-only" role="status" aria-live="polite">
                {telegramLinkCopied ? 'Command copied to clipboard' : ''}
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="telegram-test-chat-id" className="text-[12px]">
              Chat ID for test (optional)
            </Label>
            <Input
              id="telegram-test-chat-id"
              className="h-8 text-[13px] font-mono"
              placeholder="e.g. 123456789"
              value={telegramTestChatId}
              onChange={(e) => setTelegramTestChatId(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Message @userinfobot on Telegram to get your numeric ID, or link above and leave this blank.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={sendTelegramTest}
            disabled={isSendingTelegramTest || (!telegramStatus?.linked && !telegramTestChatId.trim())}
          >
            {isSendingTelegramTest ? 'Sending…' : 'Send test message'}
          </Button>
          {telegramTestMessage && (
            <p className="text-[12px] text-muted-foreground">{telegramTestMessage}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
