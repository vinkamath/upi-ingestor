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
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [fetchMessage, setFetchMessage] = useState<string | null>(null)

  async function load() {
    setIsLoading(true)
    const res = await fetch('/api/transactions')
    const json = await res.json()
    const rows = json.data ?? []
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

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

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
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-2">{new Date(tx.occurred_at).toLocaleString()}</td>
                <td className="p-2">{tx.merchant_raw}</td>
                <td className="p-2">{tx.amount}</td>
                <td className="p-2">{tx.category ?? '-'}</td>
                <td className="p-2">{tx.status}</td>
                <td className="p-2">{tx.bank_ref_id}</td>
              </tr>
            ))}
            {txs.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-gray-500" colSpan={6}>
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
