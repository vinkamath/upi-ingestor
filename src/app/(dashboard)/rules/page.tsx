'use client'

import { useEffect, useState } from 'react'

type Rule = {
  id: string
  match_type: 'regex' | 'contains' | 'equals'
  field: 'merchant' | 'sender' | 'body'
  pattern: string
  category: string
  priority: number
}

const empty = {
  match_type: 'contains' as const,
  field: 'merchant' as const,
  pattern: '',
  category: '',
  priority: 100,
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [draft, setDraft] = useState(empty)

  async function loadRules() {
    const res = await fetch('/api/rules')
    const json = await res.json()
    setRules(json.data ?? [])
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadRules()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function addRule() {
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    setDraft(empty)
    await loadRules()
  }

  async function removeRule(id: string) {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    await loadRules()
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Categorization Rules</h1>

      <div className="rounded-lg border bg-white p-4 grid gap-3 sm:grid-cols-2">
        <select className="border rounded p-2" value={draft.match_type} onChange={(e) => setDraft((s) => ({ ...s, match_type: e.target.value as Rule['match_type'] }))}>
          <option value="contains">contains</option>
          <option value="equals">equals</option>
          <option value="regex">regex</option>
        </select>
        <select className="border rounded p-2" value={draft.field} onChange={(e) => setDraft((s) => ({ ...s, field: e.target.value as Rule['field'] }))}>
          <option value="merchant">merchant</option>
          <option value="sender">sender</option>
          <option value="body">body</option>
        </select>
        <input className="border rounded p-2" placeholder="pattern" value={draft.pattern} onChange={(e) => setDraft((s) => ({ ...s, pattern: e.target.value }))} />
        <input className="border rounded p-2" placeholder="category" value={draft.category} onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))} />
        <input className="border rounded p-2" type="number" placeholder="priority" value={draft.priority} onChange={(e) => setDraft((s) => ({ ...s, priority: Number(e.target.value) }))} />
        <button className="rounded bg-black text-white px-3 py-2" onClick={addRule}>Add rule</button>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between border rounded p-3">
            <p className="text-sm">
              <strong>{rule.category}</strong> when {rule.field} {rule.match_type} <code>{rule.pattern}</code>
            </p>
            <button className="text-sm text-red-600" onClick={() => removeRule(rule.id)}>Delete</button>
          </div>
        ))}
        {rules.length === 0 ? <p className="text-sm text-gray-500">No rules yet.</p> : null}
      </div>
    </main>
  )
}
