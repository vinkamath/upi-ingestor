'use client'

import { useEffect, useState } from 'react'

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
  const [publishingId, setPublishingId] = useState<string | null>(null)
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
    const loaded = (json?.categories ?? []) as MonarchCategoryOption[]
    setCategories(loaded)
  }

  async function fetchNow() {
    setFetchMessage('Fetching latest Gmail transactions...')
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
        `Fetch complete. matched=${summary.fetched}, parsed=${summary.parsed}, inserted=${summary.inserted}, duplicates=${summary.duplicates}, noBody=${summary.skippedNoBody}, parseFail=${summary.skippedParseFailure}, tableRows=${count}`
      )
      return
    }
    setFetchMessage(`Fetch complete. Loaded ${count} transaction(s).`)
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

  async function saveCategory(id: string) {
    const category = categoryDrafts[id]?.trim()
    if (!category) {
      setFetchMessage('Pick a category first.')
      return
    }
    setSavingCategoryId(id)
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    })
    const json = await res.json()
    if (!res.ok) {
      setFetchMessage(json?.error ?? 'Failed to update category. Please try again.')
      setSavingCategoryId(null)
      return
    }
    setSavingCategoryId(null)
    await load()
    setFetchMessage('Category updated.')
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
      if (!category) {
        failCount += 1
        continue
      }

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category }),
        })
        if (res.ok) successCount += 1
        else failCount += 1
      } catch {
        failCount += 1
      }
    }

    await load()
    setSavingCategoryId(null)
    setFetchMessage(
      failCount === 0
        ? `Saved category for ${successCount} transaction(s).`
        : `Saved category for ${successCount} transaction(s). ${failCount} failed.`
    )
  }

  async function deleteSelectedTransactions() {
    const ids = filteredTxs.map((tx) => tx.id).filter((id) => selectedIds[id])
    if (ids.length === 0) {
      setFetchMessage('Select at least one transaction.')
      return
    }

    const shouldDelete = window.confirm(`Delete ${ids.length} transaction(s)? You can refetch them from Gmail.`)
    if (!shouldDelete) return

    setDeletingId('__bulk__')
    let successCount = 0
    let failCount = 0

    for (const id of ids) {
      try {
        const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        if (res.ok) successCount += 1
        else failCount += 1
      } catch {
        failCount += 1
      }
    }

    await load()
    setDeletingId(null)
    setFetchMessage(
      failCount === 0
        ? `Deleted ${successCount} transaction(s).`
        : `Deleted ${successCount} transaction(s). ${failCount} failed.`
    )
  }

  async function publishTransaction(id: string) {
    const category = categoryDrafts[id]?.trim()
    if (!category) {
      setFetchMessage('Pick a category first.')
      return
    }

    setPublishingId(id)
    const res = await fetch(`/api/transactions/${id}/republish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    })
    const json = await res.json()
    if (!res.ok) {
      setFetchMessage(json?.error ?? 'Failed to publish transaction. Please try again.')
      setPublishingId(null)
      return
    }
    await load()
    setPublishingId(null)
    setFetchMessage(json?.message ?? 'Transaction published successfully.')
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
      } catch {
        failCount += 1
      }
    }

    await load()
    setPublishingAll(false)
    setFetchMessage(
      failCount === 0
        ? `Published ${successCount} transaction(s).`
        : `Published ${successCount} transaction(s). ${failCount} failed.`
    )
  }

  async function publishAllVisible() {
    const eligible = filteredTxs
      .filter((tx) => tx.status !== 'published')
      .map((tx) => ({ id: tx.id, category: categoryDrafts[tx.id]?.trim() }))
      .filter((row): row is { id: string; category: string } => Boolean(row.category))

    if (eligible.length === 0) {
      setFetchMessage('No unpublished transactions with an assigned category in the current view.')
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
      } catch {
        failCount += 1
      }
    }

    await load()
    setPublishingAll(false)
    setFetchMessage(
      failCount === 0
        ? `Published ${successCount} transaction(s).`
        : `Published ${successCount} transaction(s). ${failCount} failed.`
    )
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <button
          className="rounded border px-3 py-2 text-sm bg-white disabled:opacity-50"
          onClick={fetchNow}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Fetch Gmail now'}
        </button>
      </div>
      <p className="text-sm text-gray-600">
        {usdToInr
          ? `FX rate: 1 USD = ${usdToInr.toFixed(2)} INR${rateDate ? ` (as of ${rateDate})` : ''}`
          : 'FX rate: unavailable'}
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm text-gray-700">
          Status:
        </label>
        <select
          id="status-filter"
          className="border rounded px-2 py-1 text-sm"
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
        <div className="flex items-center gap-2">
          <button
            className="rounded border px-3 py-2 text-sm bg-white disabled:opacity-50"
            onClick={saveSelectedCategories}
            disabled={
              publishingAll ||
              Boolean(publishingId) ||
              Boolean(deletingId) ||
              Boolean(savingCategoryId) ||
              selectedCount === 0
            }
          >
            {savingCategoryId === '__bulk__' ? 'Saving categories...' : `Save category (${selectedCount})`}
          </button>
          <button
            className="rounded border px-3 py-2 text-sm bg-white disabled:opacity-50"
            onClick={deleteSelectedTransactions}
            disabled={
              publishingAll ||
              Boolean(publishingId) ||
              Boolean(deletingId) ||
              Boolean(savingCategoryId) ||
              selectedCount === 0
            }
          >
            {deletingId === '__bulk__' ? 'Deleting...' : `Delete (${selectedCount})`}
          </button>
        <button
          className="rounded border px-3 py-2 text-sm bg-white disabled:opacity-50"
            onClick={publishSelectedTransactions}
            disabled={
              publishingAll ||
              Boolean(publishingId) ||
              Boolean(deletingId) ||
              Boolean(savingCategoryId) ||
              selectedCount === 0
            }
        >
            {publishingAll ? 'Publishing...' : `Publish (${selectedCount})`}
        </button>
          <button
            className="rounded border px-3 py-2 text-sm bg-white disabled:opacity-50"
            onClick={publishAllVisible}
            disabled={publishingAll || Boolean(publishingId) || Boolean(deletingId) || Boolean(savingCategoryId)}
          >
            {publishingAll ? 'Publishing all...' : 'Publish all visible'}
          </button>
        </div>
      </div>
      {fetchMessage ? <p className="text-sm text-gray-600">{fetchMessage}</p> : null}

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">
                <input
                  type="checkbox"
                  aria-label="Select all visible transactions"
                  checked={allSelected}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setSelectedIds((prev) => {
                      const next = { ...prev }
                      for (const tx of filteredTxs) next[tx.id] = checked
                      return next
                    })
                  }}
                />
              </th>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Merchant</th>
              <th className="text-left p-2">Amount</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Ref</th>
              <th className="text-left p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTxs.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-2">
                  <input
                    type="checkbox"
                    aria-label={`Select transaction ${tx.id}`}
                    checked={Boolean(selectedIds[tx.id])}
                    onChange={(e) =>
                      setSelectedIds((prev) => ({
                        ...prev,
                        [tx.id]: e.target.checked,
                      }))
                    }
                  />
                </td>
                <td className="p-2">{new Date(tx.email_received_at ?? tx.occurred_at).toLocaleString()}</td>
                <td className="p-2">{tx.merchant_raw}</td>
                <td className="p-2">
                  <div>INR {tx.amount.toFixed(2)}</div>
                  <div className="text-gray-500">
                    USD {usdPerInr ? Math.abs(tx.amount * usdPerInr).toFixed(2) : '-'}
                  </div>
                </td>
                <td className="p-2">
                  {categories.length > 0 ? (
                    <select
                      className="border rounded p-1 text-sm min-w-[180px]"
                      value={categoryDrafts[tx.id] ?? tx.category ?? ''}
                      onChange={(e) =>
                        setCategoryDrafts((prev) => ({
                          ...prev,
                          [tx.id]: e.target.value,
                        }))
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
                      className="border rounded p-1 text-sm min-w-[180px]"
                      placeholder="Category"
                      value={categoryDrafts[tx.id] ?? tx.category ?? ''}
                      onChange={(e) =>
                        setCategoryDrafts((prev) => ({
                          ...prev,
                          [tx.id]: e.target.value,
                        }))
                      }
                    />
                  )}
                </td>
                <td className="p-2">
                  {tx.status === 'failed' && tx.raw_payload?.publish_error ? (
                    <span title={tx.raw_payload.publish_error} className="cursor-help underline decoration-dotted">
                      failed
                    </span>
                  ) : (
                    tx.status
                  )}
                </td>
                <td className="p-2">{tx.bank_ref_id.slice(0, 12)}</td>
                <td className="p-2">
                  <div className="flex items-center gap-3">
                    <button
                      className="text-sm text-blue-700 disabled:opacity-50"
                      onClick={() => publishTransaction(tx.id)}
                      disabled={publishingId === tx.id || deletingId === tx.id}
                    >
                      {publishingId === tx.id
                        ? 'Publishing...'
                        : tx.status === 'published'
                          ? 'Republish'
                          : 'Publish'}
                    </button>
                    {tx.status === 'failed' && tx.raw_payload?.publish_error ? (
                      <span className="text-xs text-red-600" title={tx.raw_payload.publish_error}>
                        Error
                      </span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTxs.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-gray-500" colSpan={8}>
                  No matching transactions for this status filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  )
}
