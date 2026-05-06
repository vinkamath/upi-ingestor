'use client'

import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const [gmailStatus, setGmailStatus] = useState<{
    connected: boolean
    emailAddress: string | null
    lastUpdatedAt: string | null
  } | null>(null)
  const [monarch, setMonarch] = useState({ email: '', credential: '', defaultAccountId: '' })
  const [telegramCode, setTelegramCode] = useState<string | null>(null)

  async function loadGmailStatus() {
    const res = await fetch('/api/connect/gmail/status')
    const json = await res.json()
    setGmailStatus(json)
  }

  async function saveMonarch() {
    await fetch('/api/connect/monarch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monarch),
    })
  }

  async function createTelegramLink() {
    const res = await fetch('/api/connect/telegram', { method: 'POST' })
    const json = await res.json()
    setTelegramCode(json.linkCode)
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadGmailStatus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Connections</h1>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-medium">Gmail</h2>
        {gmailStatus?.connected ? (
          <p className="text-sm text-gray-700">
            Connected as <strong>{gmailStatus.emailAddress}</strong>
          </p>
        ) : (
          <p className="text-sm text-gray-700">Not connected yet.</p>
        )}
        <a
          className="inline-block rounded bg-black text-white px-3 py-2"
          href="/api/auth/google?next=/settings"
        >
          {gmailStatus?.connected ? 'Reconnect Gmail' : 'Connect Gmail with Google'}
        </a>
      </section>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-medium">Monarch</h2>
        <input className="w-full border rounded p-2" placeholder="Monarch email" value={monarch.email} onChange={(e) => setMonarch((s) => ({ ...s, email: e.target.value }))} />
        <input className="w-full border rounded p-2" placeholder="Monarch token or credential" value={monarch.credential} onChange={(e) => setMonarch((s) => ({ ...s, credential: e.target.value }))} />
        <input className="w-full border rounded p-2" placeholder="Default account id" value={monarch.defaultAccountId} onChange={(e) => setMonarch((s) => ({ ...s, defaultAccountId: e.target.value }))} />
        <button className="rounded bg-black text-white px-3 py-2" onClick={saveMonarch}>Save Monarch connection</button>
      </section>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="font-medium">Telegram</h2>
        <button className="rounded bg-black text-white px-3 py-2" onClick={createTelegramLink}>Create Telegram link code</button>
        {telegramCode ? <p className="text-sm text-gray-700">Run <code>/start {telegramCode}</code> in your bot chat.</p> : null}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <button className="rounded border px-3 py-2" onClick={() => fetch('/api/gmail/fetch-now', { method: 'POST' })}>
          Fetch Gmail transactions now
        </button>
      </section>
    </main>
  )
}
