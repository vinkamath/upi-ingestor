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

  async function load() {
    const res = await fetch('/api/transactions')
    const json = await res.json()
    setTxs(json.data ?? [])
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Transactions</h1>

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
          </tbody>
        </table>
      </div>
    </main>
  )
}
