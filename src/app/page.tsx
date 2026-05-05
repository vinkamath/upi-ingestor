import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">UPI Ingestor Dashboard</h1>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-md border px-3 py-1.5 text-sm">Logout</button>
        </form>
      </div>

      <p className="text-sm text-gray-600">Signed in as {user?.email}</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link className="rounded-lg border bg-white p-4" href="/settings">
          Settings
        </Link>
        <Link className="rounded-lg border bg-white p-4" href="/rules">
          Rules
        </Link>
        <Link className="rounded-lg border bg-white p-4" href="/transactions">
          Transactions
        </Link>
      </div>
    </main>
  )
}
