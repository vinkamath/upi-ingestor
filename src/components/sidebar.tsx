'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpDown, BookOpen, Settings2, LogOut, Zap, BarChart2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/rules', label: 'Rules', icon: BookOpen },
  { href: '/settings', label: 'Settings', icon: Settings2 },
]

interface SidebarProps {
  userEmail?: string
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col h-full bg-sidebar border-r border-sidebar-border">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Zap className="h-3.5 w-3.5 text-primary-foreground fill-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-tight">UPI Ingestor</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Monarch Sync</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-100',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-[15px] w-[15px] shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3 border-t border-sidebar-border pt-3">
          {userEmail && (
            <p className="text-[11px] text-muted-foreground px-3 pb-1.5 truncate">{userEmail}</p>
          )}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-100"
            >
              <LogOut className="h-[15px] w-[15px] shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar border-t border-sidebar-border z-50 flex items-center justify-around px-1 py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 flex-1 py-2 px-1 rounded-lg transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <form action="/api/auth/logout" method="post" className="flex-1">
          <button
            type="submit"
            className="flex flex-col items-center gap-0.5 w-full py-2 px-1 rounded-lg text-muted-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Sign out</span>
          </button>
        </form>
      </nav>
    </>
  )
}
