'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Trash2, Upload, CheckSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { buildMonarchTransactionsUrl, toTransactionYmd } from '@/lib/monarch-url'
import { partitionMonarchCategoriesForPicker } from '@/lib/monarch-categories'
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

type StatusMessage = {
  text: string
  monarchHref?: string
}

function txDateYmd(tx: Tx) {
  return toTransactionYmd(tx.email_received_at ?? tx.occurred_at)
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

const chevronSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
const chevronStyle = { backgroundImage: chevronSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }
const chevronSmallSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`
const chevronSmallStyle = { backgroundImage: chevronSmallSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }

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
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null)
  const [pinnedCategoryNames, setPinnedCategoryNames] = useState<string[]>([])

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

  async function loadMonarchConnection() {
    const res = await fetch('/api/connect/monarch')
    const json = await res.json()
    if (!res.ok) return
    const accountId = typeof json?.defaultAccountId === 'string' ? json.defaultAccountId : null
    setDefaultAccountId(accountId || null)
  }

  async function loadPinnedCategories() {
    const res = await fetch('/api/settings/preferences')
    const json = await res.json()
    if (!res.ok) return
    const names = json?.pinnedCategoryNames
    if (Array.isArray(names)) setPinnedCategoryNames(names.filter((n: unknown) => typeof n === 'string'))
  }

  async function fetchNow() {
    setStatusMessage({ text: 'Fetching latest Gmail transactions…' })
    const res = await fetch('/api/gmail/fetch-now', { method: 'POST' })
    if (!res.ok) {
      setStatusMessage({ text: 'Fetch failed. Check server logs and try again.' })
      return
    }
    const json = await res.json()
    const summary = json?.summary
    const count = await load()
    if (summary) {
      setStatusMessage({
        text: `Fetched: ${summary.fetched} matched · ${summary.parsed} parsed · ${summary.inserted} inserted · ${summary.duplicates} dupes · ${count} total`,
      })
      return
    }
    setStatusMessage({ text: `Fetch complete — ${count} transaction(s) loaded.` })
  }

  async function deleteTransaction(id: string) {
    const shouldDelete = window.confirm(
      'Delete this transaction? You can refetch it from Gmail and apply updated rules.'
    )
    if (!shouldDelete) return
    setDeletingId(id)
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setStatusMessage({ text: 'Failed to delete transaction. Please try again.' })
      setDeletingId(null)
      return
    }
    await load()
    setDeletingId(null)
    setStatusMessage({ text: 'Transaction deleted. You can refetch now to apply new rules.' })
  }

  async function saveSelectedCategories() {
    const ids = filteredTxs.map((tx) => tx.id).filter((id) => selectedIds[id])
    if (ids.length === 0) {
      setStatusMessage({ text: 'Select at least one transaction.' })
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
    setStatusMessage({
      text:
        failCount === 0
          ? `Saved category for ${successCount} transaction(s).`
          : `Saved ${successCount}, failed ${failCount}.`,
    })
  }

  async function deleteSelectedTransactions() {
    const ids = filteredTxs.map((tx) => tx.id).filter((id) => selectedIds[id])
    if (ids.length === 0) { setStatusMessage({ text: 'Select at least one transaction.' }); return }
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
    setStatusMessage({
      text:
        failCount === 0
          ? `Deleted ${successCount} transaction(s).`
          : `Deleted ${successCount}, failed ${failCount}.`,
    })
  }

  function monarchHrefForPublishedDates(dates: string[]) {
    if (!defaultAccountId || dates.length === 0) return undefined
    const startDate = dates.reduce((earliest, date) => (date < earliest ? date : earliest))
    const endDate = dates.reduce((latest, date) => (date > latest ? date : latest))
    return buildMonarchTransactionsUrl(defaultAccountId, startDate, endDate)
  }

  async function publishTransactions(eligible: { id: string; category: string }[]) {
    setPublishingAll(true)
    const txById = new Map(txs.map((tx) => [tx.id, tx]))
    let successCount = 0
    let failCount = 0
    const publishedDates: string[] = []
    for (const row of eligible) {
      try {
        const res = await fetch(`/api/transactions/${row.id}/republish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: row.category }),
        })
        if (res.ok) {
          successCount += 1
          const tx = txById.get(row.id)
          const ymd = tx ? txDateYmd(tx) : null
          if (ymd) publishedDates.push(ymd)
        } else {
          failCount += 1
        }
      } catch {
        failCount += 1
      }
    }
    await load()
    setPublishingAll(false)
    const monarchHref = monarchHrefForPublishedDates(publishedDates)
    setStatusMessage({
      text:
        failCount === 0
          ? `Published ${successCount} transaction(s).`
          : `Published ${successCount}, failed ${failCount}.`,
      monarchHref: successCount > 0 ? monarchHref : undefined,
    })
  }

  async function publishSelectedTransactions() {
    const eligible = filteredTxs
      .filter((tx) => selectedIds[tx.id])
      .map((tx) => ({ id: tx.id, category: categoryDrafts[tx.id]?.trim() }))
      .filter((row): row is { id: string; category: string } => Boolean(row.category))
    if (eligible.length === 0) {
      setStatusMessage({ text: 'Select at least one transaction with an assigned category.' })
      return
    }
    await publishTransactions(eligible)
  }

  async function publishAllVisible() {
    const eligible = filteredTxs
      .filter((tx) => tx.status !== 'published')
      .map((tx) => ({ id: tx.id, category: categoryDrafts[tx.id]?.trim() }))
      .filter((row): row is { id: string; category: string } => Boolean(row.category))
    if (eligible.length === 0) {
      setStatusMessage({ text: 'No unpublished transactions with a category in the current view.' })
      return
    }
    await publishTransactions(eligible)
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
      void loadCategories()
      void loadMonarchConnection()
      void loadPinnedCategories()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const usdToInr = usdPerInr && usdPerInr > 0 ? 1 / usdPerInr : null
  const filteredTxs = txs.filter((tx) => (statusFilter === 'all' ? true : tx.status === statusFilter))
  const selectedCount = filteredTxs.reduce((count, tx) => count + (selectedIds[tx.id] ? 1 : 0), 0)
  const allSelected = filteredTxs.length > 0 && selectedCount === filteredTxs.length
  const isBusy = isLoading || publishingAll || Boolean(deletingId) || Boolean(savingCategoryId)
  const categoryGroups = useMemo(
    () => partitionMonarchCategoriesForPicker(categories, pinnedCategoryNames),
    [categories, pinnedCategoryNames]
  )

  function CategoryField({ txId, category }: { txId: string; category: string | null }) {
    const hasCategories = categories.length > 0
    if (hasCategories) {
      const { pinned, rest } = categoryGroups
      return (
        <select
          className="h-7 w-full rounded-lg border border-border bg-background text-[12px] text-foreground px-2 pr-6 focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
          style={chevronSmallStyle}
          value={categoryDrafts[txId] ?? category ?? ''}
          onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [txId]: e.target.value }))}
        >
          <option value="" disabled>Select category</option>
          {pinned.length > 0 && (
            <optgroup label="Quick categories">
              {pinned.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </optgroup>
          )}
          {rest.length > 0 && (
            <optgroup label={pinned.length > 0 ? 'All categories' : 'Categories'}>
              {rest.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </optgroup>
          )}
        </select>
      )
    }
    return (
      <input
        className="h-7 w-full rounded-lg border border-border bg-background text-[12px] text-foreground px-2 focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Category"
        value={categoryDrafts[txId] ?? category ?? ''}
        onChange={(e) => setCategoryDrafts((prev) => ({ ...prev, [txId]: e.target.value }))}
      />
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] md:text-[28px] leading-tight tracking-[-0.5px] text-foreground">Transactions</h1>
          <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
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
          <span className="hidden sm:inline">{isLoading ? 'Loading…' : 'Fetch Gmail'}</span>
          <span className="sm:hidden">{isLoading ? '…' : 'Fetch'}</span>
        </Button>
      </div>

      {/* Toolbar */}
      <div className="space-y-2">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-[13px] text-muted-foreground shrink-0">
            Status
          </label>
          <select
            id="status-filter"
            className="h-8 rounded-lg border border-border bg-card text-[13px] text-foreground px-2 pr-7 focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            style={chevronStyle}
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

        {/* Bulk actions — horizontally scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={saveSelectedCategories}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-[13px] shrink-0"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {savingCategoryId === '__bulk__' ? 'Saving…' : `Save (${selectedCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSelectedTransactions}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-[13px] shrink-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deletingId === '__bulk__' ? 'Deleting…' : `Delete (${selectedCount})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={publishSelectedTransactions}
            disabled={isBusy || selectedCount === 0}
            className="gap-1.5 text-[13px] shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            {publishingAll ? 'Publishing…' : `Publish (${selectedCount})`}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={publishAllVisible}
            disabled={isBusy}
            className="gap-1.5 text-[13px] shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            {publishingAll ? 'Publishing…' : 'Publish all'}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="flex items-start gap-2 rounded-lg bg-card border border-border px-4 py-2.5 text-[13px] text-foreground">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <span>
            {statusMessage.text}
            {statusMessage.monarchHref && (
              <>
                {' '}
                <a
                  href={statusMessage.monarchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  Review in Monarch
                </a>
              </>
            )}
          </span>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-sm">
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
                  <CategoryField txId={tx.id} category={tx.category} />
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
              </TableRow>
            ))}
            {filteredTxs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-[13px] text-muted-foreground">
                  {isLoading ? 'Loading transactions…' : 'No transactions match this filter.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {/* Select all */}
        {filteredTxs.length > 0 && (
          <div className="flex items-center gap-2 px-1">
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
            <span className="text-[12px] text-muted-foreground">Select all</span>
          </div>
        )}

        {filteredTxs.map((tx) => (
          <div
            key={tx.id}
            className={cn(
              'rounded-xl border border-border bg-card p-3 shadow-sm transition-colors',
              selectedIds[tx.id] && 'border-primary/30 bg-primary/5'
            )}
          >
            {/* Top row: checkbox + merchant + amount + status */}
            <div className="flex items-start gap-2.5 mb-2.5">
              <Checkbox
                aria-label={`Select transaction ${tx.id}`}
                checked={Boolean(selectedIds[tx.id])}
                onCheckedChange={(checked) =>
                  setSelectedIds((prev) => ({ ...prev, [tx.id]: Boolean(checked) }))
                }
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{tx.merchant_raw}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(tx.email_received_at ?? tx.occurred_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: '2-digit',
                  })}
                  {' · '}
                  {new Date(tx.email_received_at ?? tx.occurred_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-semibold text-foreground">₹{tx.amount.toFixed(0)}</p>
                <p className="text-[11px] text-muted-foreground">
                  ${usdPerInr ? Math.abs(tx.amount * usdPerInr).toFixed(2) : '—'}
                </p>
              </div>
            </div>

            {/* Bottom row: category + status badge + delete */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <CategoryField txId={tx.id} category={tx.category} />
              </div>
              {tx.status === 'failed' && tx.raw_payload?.publish_error ? (
                <Badge
                  className={cn('border text-[11px] shrink-0 cursor-help', STATUS_CONFIG[tx.status].className)}
                  title={tx.raw_payload.publish_error}
                >
                  {STATUS_CONFIG[tx.status].label}
                </Badge>
              ) : (
                <Badge className={cn('border text-[11px] shrink-0', STATUS_CONFIG[tx.status].className)}>
                  {STATUS_CONFIG[tx.status].label}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => deleteTransaction(tx.id)}
                disabled={isBusy}
                aria-label="Delete transaction"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {filteredTxs.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
            {isLoading ? 'Loading transactions…' : 'No transactions match this filter.'}
          </div>
        )}
      </div>
    </div>
  )
}
