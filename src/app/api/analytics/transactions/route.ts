import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const category = searchParams.get('category')

  if (!month || !category) {
    return NextResponse.json({ error: 'month and category are required' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: txs, error } = await supabase
    .from('transactions')
    .select('id, occurred_at, email_received_at, amount, merchant_raw, status, bank_ref_id')
    .eq('category', category)
    .neq('status', 'failed')
    .order('occurred_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter to the requested month using the same logic as the aggregator
  const filtered = (txs ?? []).filter(
    (tx) => monthKey(tx.email_received_at ?? tx.occurred_at) === month
  )

  return NextResponse.json({ transactions: filtered })
}
