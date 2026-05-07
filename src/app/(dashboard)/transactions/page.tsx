'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Trash2, Upload, CheckSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Tx = {
  id: string
  occurred_at: string
  email_received_at?: string | null
  amount: number
  merchant_raw: string
  category: string | null
  status: 'pending' | 'needs_review' | 'published' | 'failed'
  bank_ref_id: string
  raw_payload?: {
    publish_error?: string
  }
}

type TxStatusFilter = 'all' | Tx['status']

type MonarchCategoryOption = {
  id: string
  name: string
}

const STATUS_CONFIG: Record<
  Tx['status'],
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-warning/20 text-yellow-800 border-warning/30',
  },
  needs_review: {
    label: 'Review',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  published: {
    label: 'Published',
    className: 'bg-positive/10 text-green-800 border-positive/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [categories, setCategories] = useState<MonarchCategoryOption[]>([])
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, string>>({})
  const [usdPerInr, setUsdPerInr] = useState<number | null>(null)
  const [rateDate, setRateDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<TxStatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [fetchMessage, setFetchMessage] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    const res = await fetch('/api/transactions')
    const json = await res.json()
    const rows = json.data ?? []
    const fxRate = typeof json?.fx?.usdPerInr === 'number' ? json.fx.usdPerInr : null
    setUsdPerInr(fxRate)
    setRateDate(typeof json?.fx?.rateDate === 'string' ? json.fx.rateDate : null)
    setTxs(rows)
    setCategoryDrafts((prev) => {
      const next = { ...prev }
      for (const tx of rows as Tx[]) {
        next[tx.id] = prev[tx.id] ?? tx.category ?? ''
      }
      return next
    })
    setSelectedIds((prev) => {
      const next = { ...prev }
      for (const tx of rows as Tx[]) {
        if (next[tx.id] == null) next[tx.id] = false
      }
      return next
    })
    setIsLoading(false)
    return rows.length as number
  }

  async function loadCategories() {
    const res = await fetch('/api/connect/monarch/categories')
    const json = await res.json()
    if (!res.ok) return
    setCategories((json?.categories ?? []) as MonarchCategoryOption[])
  }

  async function fetchNow() {
    setFetchMessage('Fetching latest Gmail transactions…')
    const res = await fetch('/api/gmail/fetch-now', { method: 'POST' })
    if (!res.ok) {
      setFetchMessage('Fetch failed. Check server logs and try again.')
      return
    }
    const json = await res.json()
    const summary = json?.summary
    const count = await load()
    if (summary) {
      setFetchMessage(
        `Fetched: ${summary.fetched} matched · ${summary.parsed} parsed · ${summary.inserted} inserted · ${summary.duplicates} dupes · ${count} total`
      )
      return
    }
    setFetchMessage(`Fetch complete — ${count} transaction(s) loaded.`)
  }

  async function deleteTransaction(id: string) {
    const shouldDelete = window.confirm(
      'Delete this transaction? You can refetch it from Gmail and apply updated rules.'
    )
    if (!shouldDelete) return
    setDeletingId(id)
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setFetchMessage('Failed to delete transaction. Please try again.')
      setDeletingId(null)
      return
    }
    await load()
    setDeletingId(null)
    setFetchMessage('Transaction deleted. You can refetch now to apply new rules.')
  }

  async function saveSelectedCategories() {
    const ids = filteredTxs.map((tx) => tx.id).filter((id) => selectedIds[id])
    if (ids.length === 0) {
      setFetchMessage('Select at least one transaction.')
      return
    }
    setSavingCategoryId('__bulk__')
    let successCount = 0
    let failCount = 0
    for (const id of ids) {
      const category = categoryDrafts[id]?.trim()
      if (!category) { failCount += 1; continue }
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category }),
        })
        if (res.ok) successCount += 1
        else failCount += 1
      } catch { failCount += 1 }
    }
    await load()
    setSavingCategoryId(null)
    setFetchMessage(
      failCount === 0
        ? `Saved category for ${successCount} transaction(s).`
        : `Saved ${successCount}, failed ${failCount}.`
    )
  }

  async function deleteSelectedTransactions() {
    const ids = filteredTxs.map((tx) => tx.id).filter((id) => selectedIds[id])
    if (ids.length === 0) { setFetchMessage('Select at least one transaction.'); return }
    const shouldDelete = window.confirm(`Delete ${ids.length} transaction(s)?`)
    if (!shouldDelete) return
    setDeletingId('__bulk__')
    let successCount = 0
    let failCount = 0
    for (const id of ids) {
      try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        if (res.ok) successCount += 1
        else failCount += 1
      } catch { failCount += 1 }
    }
    await load()
    setDeletingId(null)
    setFetchMessage(
      failCount === 0
        ? `Deleted ${successCount} transaction(s).`
        : `Deleted ${successCount}, failed ${failCount}.`
    )
  }

  async function publishSelectedTransactions() {
    const eligible = filteredTxs
      .filter((tx) => selectedIds[tx.id])
      .map((tx) => ({ id: tx.id, category: categoryDrafts[tx.id]?.trim() }))
      .filter((row): row is { id: string; category: string } => Boolean(row.category))
    if (eligible.length === 0) {
      setFetchMessage('Select at least one transaction with an assigned category.')
      return
    }
    setPublishingAll(true)
    let successCount = 0
    let failCount = 0
    for (const row of eligible) {
      try {
        const res = await fetch(`/api/transactions/${row.id}/republish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: row.category }),
        })
        if (res.ok) successCount += 1
        else failCount += 1
      } catch { failCount += 1 }
    }
    await load()
    setPublishingAll(false)
    setFetchMessage(
      failCount === 0
        ? `Published ${successCount} transaction(s).`
        : `Published ${successCount}, failed ${failCount}.`
    )
  }

  async function publishAllVisible() {
    const eligible = filteredTxs
      .filter((tx) => tx.status !== 'published')
      .map((tx) => ({ id: tx.id, category: categoryDrafts[tx.id]?.trim() }))
      .filter((row): row is { id: string; category: string } => Boolean(row.category))
    if (eligible.length === 0) {
      setFetchMessage('No unpublished transactions with a category in the current view.')
      return
    }
    setPublishingAll(true)
    let successCount = 0
    let failCount = 0
    for (const row of eligible) {
      try {
        const res = await fetch(`/api/transactions/${row.id}/republish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: row.category }),
        })
        if (res.ok) successCount += 1
        else failCount += 1
      } catch { failCount += 1 }
    }
    await load()
    setPublishingAll(false)
    setFetchMessage(
      failCount === 0
        ? `Published ${successCount} transaction(s).`
        : `Published ${successCount}, failed ${failCount}.`
    )
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
      void loadCategories()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const usdToInr = usdPerInr && usdPerInr > 0 ? 1 / usdPerInr : null
  const filteredTxs = txs.filter((tx) => (statusFilter === 'all' ? true : tx.status === statusFilter))
  const selectedCount = filteredTxs.reduce((count, tx) => count + (selectedIds[tx.id] ? 1 : 0), 0)
  const allSelected = filteredTxs.length > 0 && selectedCount === filteredTxs.length
  const isBusy = isLoading || publishingAll || Boolean(deletingId) || Boolean(savingCategoryId)

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight tracking-[-0.5px] text-foreground">Transactions</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {usdToInr
              ? `1 USD = ${usdToInr.toFixed(2)} INR${rateDate ? ` · ${rateDate}` : ''}`
              : 'FX rate unavailable'}
          </p>
        </div>
        <Button
          onClick={fetchNow}
          disabled={isBusy}
          variant="default"
          size="sm"
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          {isLoading ? 'Loading…' : 'Fetch Gmail'}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-[13px] text-muted-foreground">
            Status
          </label>
          <select
            id="status-filter"
            className="h-8 rounded-lg border border-border bg-card text-[13px] text-foreground px-2 pr-7 focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TxStatusFilter)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="needs_review">Needs review</option>
            <option value="failed">Failed</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveSelectedCategories}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-[13px]"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {savingCategoryId === '__bulk__' ? 'Saving…' : `Save (${selectedCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelectedTransactions}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-[13px] text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deletingId === '__bulk__' ? 'Deleting…' : `Delete (${selectedCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={publishSelectedTransactions}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-[13px]"
          >
            <Upload className="h-3.5 w-3.5" />
            {publishingAll ? 'Publishing…' : `Publish (${selectedCount})`}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={publishAllVisible}
            disabled={isBusy}
            className="gap-1.5 text-[13px]"
          >
            <Upload className="h-3.5 w-3.5" />
            {publishingAll ? 'Publishing…' : 'Publish all'}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {fetchMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2.5 text-[13px] text-foreground">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {fetchMessage}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  aria-label="Select all visible transactions"
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    setSelectedIds((prev) => {
                      const next = { ...prev }
                      for (const tx of filteredTxs) next[tx.id] = Boolean(checked)
                      return next
                    })
                  }}
                />
              </TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Date</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Merchant</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Amount</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground min-w-[200px]">Category</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Status</TableHead>
              <TableHead className="text-[12px] font-medium text-muted-foreground">Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTxs.map((tx) => (
              <TableRow
                key={tx.id}
                className={cn(
                  'border-b border-border/60 transition-colors',
                  selectedIds[tx.id] && 'bg-primary/5'
                )}
              >
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Select transaction ${tx.id}`}
                    checked={Boolean(selectedIds[tx.id])}
                    onCheckedChange={(checked) =>
                      setSelectedIds((prev) => ({ ...prev, [tx.id]: Boolean(checked) }))
                    }
                  />
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap">
                  {new Date(tx.email_received_at ?? tx.occurred_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: '2-digit',
                  })}
                  <div className="text-[11px] text-muted-foreground/70">
                    {new Date(tx.email_received_at ?? tx.occurred_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-[13px] font-medium text-foreground max-w-[200px] truncate">
                  {tx.merchant_raw}
                </TableCell>
                <TableCell className="text-[13px] whitespace-nowrap">
                  <span className="font-medium text-foreground">₹{tx.amount.toFixed(0)}</span>
                  <div className="text-[11px] text-muted-foreground">
                    ${usdPerInr ? Math.abs(tx.amount * usdPerInr).toFixed(2) : '—'}
                  </div>
                </TableCell>
                <TableCell>
                  {categories.length > 0 ? (
                    <select
                      className="h-7 w-full rounded-lg border border-border bg-background text-[12px] text-foreground px-2 pr-6 focus:outline-none focus:ring-2 focus:ring-ring appearance-none min-w-[180px]"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
                      value={categoryDrafts[tx.id] ?? tx.category ?? ''}
                      onChange={(e) =>
                        setCategoryDrafts((prev) => ({ ...prev, [tx.id]: e.target.value }))
                      }
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="h-7 w-full rounded-lg border border-border bg-background text-[12px] text-foreground px-2 focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
                      placeholder="Category"
                      value={categoryDrafts[tx.id] ?? tx.category ?? ''}
                      onChange={(e) =>
                        setCategoryDrafts((prev) => ({ ...prev, [tx.id]: e.target.value }))
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  {tx.status === 'failed' && tx.raw_payload?.publish_error ? (
                    <Badge
                      className={cn(
                        'border text-[11px] cursor-help',
                        STATUS_CONFIG[tx.status].className
                      )}
                      title={tx.raw_payload.publish_error}
                    >
                      {STATUS_CONFIG[tx.status].label}
                    </Badge>
                  ) : (
                    <Badge
                      className={cn('border text-[11px]', STATUS_CONFIG[tx.status].className)}
                    >
                      {STATUS_CONFIG[tx.status].label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-muted-foreground font-mono">
                  {tx.bank_ref_id.slice(0, 12)}
                </TableCell>
              </TableRow>
            ))}
            {filteredTxs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-[13px] text-muted-foreground">
                  {isLoading ? 'Loading transactions…' : 'No transactions match this filter.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
