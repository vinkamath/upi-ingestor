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

type MonarchCategoryOption = {
  id: string
  name: string
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
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Omit<Rule, 'id'> | null>(null)
  const [categories, setCategories] = useState<MonarchCategoryOption[]>([])
  const [useCustomCategory, setUseCustomCategory] = useState(false)
  const [useCustomEditCategory, setUseCustomEditCategory] = useState(false)
  const [categoryStatus, setCategoryStatus] = useState<string | null>(null)

  async function loadRules() {
    const res = await fetch('/api/rules')
    const json = await res.json()
    setRules(json.data ?? [])
  }

  async function loadCategories() {
    const res = await fetch('/api/connect/monarch/categories')
    const json = await res.json()
    if (!res.ok) {
      setCategoryStatus(json?.error ?? 'Failed to load Monarch categories')
      return
    }

    const loaded = (json?.categories ?? []) as MonarchCategoryOption[]
    setCategories(loaded)
    if (loaded.length === 0) {
      setUseCustomCategory(true)
      setCategoryStatus('No Monarch categories found. Enter category manually.')
      return
    }

    setCategoryStatus('Monarch categories loaded.')
    setDraft((s) => ({ ...s, category: s.category || loaded[0].name }))
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadRules()
      void loadCategories()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function addRule() {
    if (!draft.category.trim()) return
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, category: draft.category.trim() }),
    })
    setDraft({ ...empty, category: useCustomCategory ? '' : categories[0]?.name ?? '' })
    await loadRules()
  }

  async function removeRule(id: string) {
    const shouldDelete = window.confirm('Delete this rule? This cannot be undone.')
    if (!shouldDelete) return

    await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    await loadRules()
  }

  function startEdit(rule: Rule) {
    setEditingRuleId(rule.id)
    setEditDraft({
      match_type: rule.match_type,
      field: rule.field,
      pattern: rule.pattern,
      category: rule.category,
      priority: rule.priority,
    })
    setUseCustomEditCategory(categories.length === 0)
  }

  function cancelEdit() {
    setEditingRuleId(null)
    setEditDraft(null)
    setUseCustomEditCategory(false)
  }

  async function saveEdit(ruleId: string) {
    if (!editDraft || !editDraft.category.trim()) return
    await fetch(`/api/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editDraft, category: editDraft.category.trim() }),
    })
    cancelEdit()
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
        {useCustomCategory || categories.length === 0 ? (
          <input className="border rounded p-2" placeholder="category" value={draft.category} onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))} />
        ) : (
          <select
            className="border rounded p-2"
            value={draft.category}
            onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        )}
        <input className="border rounded p-2" type="number" placeholder="priority" value={draft.priority} onChange={(e) => setDraft((s) => ({ ...s, priority: Number(e.target.value) }))} />
        <button className="rounded bg-black text-white px-3 py-2" onClick={addRule}>Add rule</button>
        <label className="text-sm text-gray-600 flex items-center gap-2">
          <input
            type="checkbox"
            checked={useCustomCategory}
            onChange={(e) => setUseCustomCategory(e.target.checked)}
          />
          Use custom category text
        </label>
        {categoryStatus ? <p className="text-sm text-gray-600 sm:col-span-2">{categoryStatus}</p> : null}
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between border rounded p-3">
            {editingRuleId === rule.id && editDraft ? (
              <div className="w-full grid gap-2 sm:grid-cols-2">
                <select className="border rounded p-2" value={editDraft.match_type} onChange={(e) => setEditDraft((s) => (s ? { ...s, match_type: e.target.value as Rule['match_type'] } : s))}>
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="regex">regex</option>
                </select>
                <select className="border rounded p-2" value={editDraft.field} onChange={(e) => setEditDraft((s) => (s ? { ...s, field: e.target.value as Rule['field'] } : s))}>
                  <option value="merchant">merchant</option>
                  <option value="sender">sender</option>
                  <option value="body">body</option>
                </select>
                <input className="border rounded p-2" value={editDraft.pattern} onChange={(e) => setEditDraft((s) => (s ? { ...s, pattern: e.target.value } : s))} />
                {useCustomEditCategory || categories.length === 0 ? (
                  <input className="border rounded p-2" value={editDraft.category} onChange={(e) => setEditDraft((s) => (s ? { ...s, category: e.target.value } : s))} />
                ) : (
                  <select className="border rounded p-2" value={editDraft.category} onChange={(e) => setEditDraft((s) => (s ? { ...s, category: e.target.value } : s))}>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
                <input className="border rounded p-2" type="number" value={editDraft.priority} onChange={(e) => setEditDraft((s) => (s ? { ...s, priority: Number(e.target.value) } : s))} />
                <label className="text-sm text-gray-600 flex items-center gap-2">
                  <input type="checkbox" checked={useCustomEditCategory} onChange={(e) => setUseCustomEditCategory(e.target.checked)} />
                  Use custom category text
                </label>
                <div className="flex items-center gap-3">
                  <button className="text-sm text-blue-700" onClick={() => saveEdit(rule.id)}>Save</button>
                  <button className="text-sm text-gray-600" onClick={cancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm">
                  <strong>{rule.category}</strong> when {rule.field} {rule.match_type} <code>{rule.pattern}</code>
                </p>
                <div className="flex items-center gap-3">
                  <button className="text-sm text-blue-700" onClick={() => startEdit(rule)}>Edit</button>
                  <button className="text-sm text-red-600" onClick={() => removeRule(rule.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
        {rules.length === 0 ? <p className="text-sm text-gray-500">No rules yet.</p> : null}
      </div>
    </main>
  )
}
