'use client'

import { useEffect, useState } from 'react'

type Tx = {
  id: string
  occurred_at: string
  amount: number
  merchant_raw: string
  category: string | null
  status: 'pending' | 'needs_review' | 'published' | 'failed'
  bank_ref_id: string
  raw_payload?: {
    publish_error?: string
  }
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [usdPerInr, setUsdPerInr] = useState<number | null>(null)
  const [rateDate, setRateDate] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [republishingId, setRepublishingId] = useState<string | null>(null)
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
    setIsLoading(false)
    return rows.length as number
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

  async function republishTransaction(id: string) {
    setRepublishingId(id)
    const res = await fetch(`/api/transactions/${id}/republish`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) {
      setFetchMessage(json?.error ?? 'Failed to republish transaction. Please try again.')
      setRepublishingId(null)
      return
    }

    await load()
    setRepublishingId(null)
    setFetchMessage(json?.message ?? 'Transaction republished successfully.')
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const usdToInr = usdPerInr && usdPerInr > 0 ? 1 / usdPerInr : null

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
      {fetchMessage ? <p className="text-sm text-gray-600">{fetchMessage}</p> : null}

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
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
            {txs.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-2">{new Date(tx.occurred_at).toLocaleString()}</td>
                <td className="p-2">{tx.merchant_raw}</td>
                <td className="p-2">
                  <div>INR {tx.amount.toFixed(2)}</div>
                  <div className="text-gray-500">
                    USD {usdPerInr ? Math.abs(tx.amount * usdPerInr).toFixed(2) : '-'}
                  </div>
                </td>
                <td className="p-2">{tx.category ?? '-'}</td>
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
                    {tx.status === 'failed' ? (
                      <button
                        className="text-sm text-blue-700 disabled:opacity-50"
                        onClick={() => republishTransaction(tx.id)}
                        disabled={republishingId === tx.id}
                      >
                        {republishingId === tx.id ? 'Republishing...' : 'Republish'}
                      </button>
                    ) : null}
                    <button
                      className="text-sm text-red-600 disabled:opacity-50"
                      onClick={() => deleteTransaction(tx.id)}
                      disabled={deletingId === tx.id || republishingId === tx.id}
                    >
                      {deletingId === tx.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {txs.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-gray-500" colSpan={7}>
                  No transactions yet. Click Fetch Gmail now to test ingestion.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  )
}
