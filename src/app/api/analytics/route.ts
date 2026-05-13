import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  })
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('occurred_at, email_received_at, amount, category, status')
    .not('category', 'is', null)
    .neq('status', 'failed')
    .order('occurred_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const monthMap = new Map<string, Record<string, number>>()

  for (const tx of txs ?? []) {
    const key = monthKey(tx.email_received_at ?? tx.occurred_at)
    const cat = tx.category as string
    if (!monthMap.has(key)) monthMap.set(key, {})
    const cats = monthMap.get(key)!
    cats[cat] = (cats[cat] ?? 0) + (tx.amount as number)
  }

  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, categories]) => ({
      month: key,
      label: monthLabel(key),
      categories,
      total: Object.values(categories).reduce((s, v) => s + v, 0),
    }))

  return NextResponse.json({ months })
}
