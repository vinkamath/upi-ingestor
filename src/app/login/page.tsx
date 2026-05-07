import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
            <Zap className="h-6 w-6 text-primary-foreground fill-primary-foreground" />
          </div>
          <div>
            <h1 className="text-[28px] leading-tight tracking-[-0.5px] text-foreground">
              UPI Ingestor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sync your UPI transactions with Monarch Money
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-foreground">Sign in to continue</h2>
            <p className="text-[13px] text-muted-foreground">
              Connect your Gmail to start importing UPI transactions.
            </p>
          </div>

          <Button asChild className="w-full gap-2.5" size="lg">
            <a href="/api/auth/google">
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </a>
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Your data stays private and is only used to sync with Monarch Money.
        </p>
      </div>
    </main>
  )
}
