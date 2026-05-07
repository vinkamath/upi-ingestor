'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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

const empty: Omit<Rule, 'id'> = {
  match_type: 'contains',
  field: 'merchant',
  pattern: '',
  category: '',
  priority: 100,
}

const styledSelect = "h-8 w-full rounded-lg border border-border bg-background text-[13px] text-foreground px-2 pr-7 focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [draft, setDraft] = useState<Omit<Rule, 'id'>>(empty)
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
      setCategoryStatus('No Monarch categories found — enter category manually.')
      return
    }
    setCategoryStatus(null)
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
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-[28px] leading-tight tracking-[-0.5px] text-foreground">
          Categorization Rules
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Rules are applied in priority order when fetching Gmail transactions.
        </p>
      </div>

      {/* Add Rule Form */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-[15px] flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add new rule
          </CardTitle>
          <CardDescription className="text-[12px]">
            Match a field against a pattern and assign a Monarch category.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Match type</Label>
              <select
                className={styledSelect}
                style={selectStyle}
                value={draft.match_type}
                onChange={(e) => setDraft((s) => ({ ...s, match_type: e.target.value as Rule['match_type'] }))}
              >
                <option value="contains">contains</option>
                <option value="equals">equals</option>
                <option value="regex">regex</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Field</Label>
              <select
                className={styledSelect}
                style={selectStyle}
                value={draft.field}
                onChange={(e) => setDraft((s) => ({ ...s, field: e.target.value as Rule['field'] }))}
              >
                <option value="merchant">merchant</option>
                <option value="sender">sender</option>
                <option value="body">body</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Pattern</Label>
              <Input
                className="h-8 text-[13px]"
                placeholder="e.g. Swiggy"
                value={draft.pattern}
                onChange={(e) => setDraft((s) => ({ ...s, pattern: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Category</Label>
              {useCustomCategory || categories.length === 0 ? (
                <Input
                  className="h-8 text-[13px]"
                  placeholder="e.g. Food & Drink"
                  value={draft.category}
                  onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))}
                />
              ) : (
                <select
                  className={styledSelect}
                  style={selectStyle}
                  value={draft.category}
                  onChange={(e) => setDraft((s) => ({ ...s, category: e.target.value }))}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Priority</Label>
              <Input
                className="h-8 text-[13px]"
                type="number"
                placeholder="100"
                value={draft.priority}
                onChange={(e) => setDraft((s) => ({ ...s, priority: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded accent-primary"
                checked={useCustomCategory}
                onChange={(e) => setUseCustomCategory(e.target.checked)}
              />
              Use custom category text
            </label>
            <Button size="sm" onClick={addRule} disabled={!draft.pattern || !draft.category}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add rule
            </Button>
          </div>

          {categoryStatus && (
            <p className="text-[12px] text-muted-foreground">{categoryStatus}</p>
          )}
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">
            {rules.length} {rules.length === 1 ? 'Rule' : 'Rules'}
          </h2>
        </div>

        {rules.length === 0 ? (
          <div className="rounded-xl border border-border border-dashed bg-card p-8 text-center">
            <Code className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">
              No rules yet. Add one above to auto-categorize transactions.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {rules.map((rule, index) => (
              <div key={rule.id}>
                {index > 0 && <Separator className="bg-border/60" />}
                {editingRuleId === rule.id && editDraft ? (
                  <div className="p-4 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Match type</Label>
                        <select
                          className={styledSelect}
                          style={selectStyle}
                          value={editDraft.match_type}
                          onChange={(e) => setEditDraft((s) => s ? { ...s, match_type: e.target.value as Rule['match_type'] } : s)}
                        >
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                          <option value="regex">regex</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Field</Label>
                        <select
                          className={styledSelect}
                          style={selectStyle}
                          value={editDraft.field}
                          onChange={(e) => setEditDraft((s) => s ? { ...s, field: e.target.value as Rule['field'] } : s)}
                        >
                          <option value="merchant">merchant</option>
                          <option value="sender">sender</option>
                          <option value="body">body</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Pattern</Label>
                        <Input
                          className="h-8 text-[13px]"
                          value={editDraft.pattern}
                          onChange={(e) => setEditDraft((s) => s ? { ...s, pattern: e.target.value } : s)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Category</Label>
                        {useCustomEditCategory || categories.length === 0 ? (
                          <Input
                            className="h-8 text-[13px]"
                            value={editDraft.category}
                            onChange={(e) => setEditDraft((s) => s ? { ...s, category: e.target.value } : s)}
                          />
                        ) : (
                          <select
                            className={styledSelect}
                            style={selectStyle}
                            value={editDraft.category}
                            onChange={(e) => setEditDraft((s) => s ? { ...s, category: e.target.value } : s)}
                          >
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px]">Priority</Label>
                        <Input
                          className="h-8 text-[13px]"
                          type="number"
                          value={editDraft.priority}
                          onChange={(e) => setEditDraft((s) => s ? { ...s, priority: Number(e.target.value) } : s)}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded accent-primary"
                        checked={useCustomEditCategory}
                        onChange={(e) => setUseCustomEditCategory(e.target.checked)}
                      />
                      Use custom category text
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={() => saveEdit(rule.id)}>Save changes</Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-3 group hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant="outline" className="text-[11px] shrink-0 border-border text-muted-foreground">
                        p={rule.priority}
                      </Badge>
                      <p className="text-[13px] text-foreground truncate">
                        <span className="font-medium">{rule.category}</span>
                        <span className="text-muted-foreground mx-1.5">when</span>
                        <span className="text-muted-foreground">{rule.field}</span>
                        <span className="text-muted-foreground mx-1.5">{rule.match_type}</span>
                        <code className="text-[12px] bg-muted px-1 py-0.5 rounded text-foreground font-mono">
                          {rule.pattern}
                        </code>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(rule)}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
