'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Mail, Landmark, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadGmailStatus()
      void loadMonarchStatus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-[28px] leading-tight tracking-[-0.5px] text-foreground">Connections</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Manage your Gmail, Monarch Money, and Telegram integrations.
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
