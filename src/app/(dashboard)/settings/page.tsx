'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Mail, Landmark, MessageSquare, ListOrdered, ChevronUp, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DEFAULT_PINNED_CATEGORY_NAMES } from '@/lib/monarch-categories'

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
        <Wifi className="h-3.5 w-3.5" />
      ) : (
        <WifiOff className="h-3.5 w-3.5" />
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
  } | null>(null)
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
  const [monarchCategories, setMonarchCategories] = useState<MonarchCategoryOption[]>([])
  const [pinnedCategoryNames, setPinnedCategoryNames] = useState<string[]>([])
  const [addCategoryName, setAddCategoryName] = useState('')
  const [isSavingPinned, setIsSavingPinned] = useState(false)
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null)

  async function loadGmailStatus() {
    const res = await fetch('/api/connect/gmail/status')
    const json = await res.json()
    setGmailStatus(json)
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

  async function createTelegramLink() {
    const res = await fetch('/api/connect/telegram', { method: 'POST' })
    const json = await res.json()
    setTelegramCode(json.linkCode)
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

  const availableToPin = monarchCategories.filter(
    (c) =>
      !pinnedCategoryNames.some(
        (n) => n.localeCompare(c.name, undefined, { sensitivity: 'accent' }) === 0
      )
  )

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadGmailStatus()
      void loadMonarchStatus()
      void loadMonarchCategories()
      void loadPinnedCategories()
    }, 0)
    return () => window.clearTimeout(id)
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
        <CardContent>
          <Button asChild variant={gmailStatus?.connected ? 'outline' : 'default'} size="sm">
            <a href="/api/auth/google?next=/settings">
              {gmailStatus?.connected ? 'Reconnect Gmail' : 'Connect with Google'}
            </a>
          </Button>
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

      {/* Telegram */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
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
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" size="sm" onClick={createTelegramLink}>
            Generate link code
          </Button>
          {telegramCode && (
            <div className="rounded-lg bg-muted px-3 py-2.5 text-[12px] text-foreground font-mono">
              /start {telegramCode}
              <p className="text-muted-foreground font-sans mt-1 text-[11px]">
                Run this command in your Telegram bot chat.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
