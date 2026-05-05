import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-semibold">UPI Ingestor</h1>
        <p className="text-sm text-gray-600">
          Sign in with Google to connect Gmail and start importing UPI transactions.
        </p>
        <Link
          href="/api/auth/google"
          className="block w-full rounded-md bg-black text-white text-center py-2"
        >
          Continue with Google
        </Link>
      </div>
    </main>
  )
}
