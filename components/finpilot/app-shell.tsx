'use client'

import type { ReactNode } from 'react'
import { FlaskConical, LayoutDashboard, type LucideIcon, PiggyBank, Receipt, RotateCcw, Settings, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFinance, type ViewId } from '@/lib/finance/store'
import { formatINR } from '@/lib/finance/format'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const NAV: { id: ViewId; label: string; short: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', short: 'Overview', icon: LayoutDashboard },
  { id: 'spending', label: 'Spending', short: 'Spending', icon: Wallet },
  { id: 'commitments', label: 'Commitments', short: 'Bills', icon: Receipt },
  { id: 'savings', label: 'Savings Goals', short: 'Goals', icon: PiggyBank },
  { id: 'simulator', label: 'What-If Simulator', short: 'Simulate', icon: FlaskConical },
  { id: 'settings', label: 'Settings', short: 'Settings', icon: Settings },
]

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]">
        <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18 L10 11 L14 14 L20 6" />
          <path d="M15 6 H20 V11" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Fin<span className="text-primary">Pilot</span>
      </span>
    </div>
  )
}

function Sidebar() {
  const { view, setView, simulationActive } = useFinance()
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <Logo className="px-2" />
      <p className="mt-1.5 px-2 text-xs text-muted-foreground">Simulate Before You Spend</p>
      <div className="mt-2 px-2">
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-inset ring-primary/20">
          Broke But Functional
        </span>
      </div>
      <nav aria-label="Sidebar navigation" className="mt-6 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <span className="flex-1">{item.label}</span>
              {item.id === 'simulator' && simulationActive && (
                <span className="size-1.5 rounded-full bg-primary" aria-label="Simulation running" />
              )}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-border bg-surface p-3.5">
        <p className="text-xs font-medium text-foreground">Educational demo</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Sample data only. Not financial advice; no bank accounts are connected.
        </p>
      </div>
    </aside>
  )
}

function MobileNav() {
  const { view, setView } = useFinance()
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-sidebar/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV.map((item) => {
        const active = view === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg py-2.5 text-[10px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5" />
            {item.short}
          </button>
        )
      })}
    </nav>
  )
}

export function ResetDemoButton({ variant = 'outline' }: { variant?: 'outline' | 'default' }) {
  const { reset } = useFinance()
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant={variant} size="sm" />}>
        <RotateCcw />
        Reset demo
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset to the demo state?</AlertDialogTitle>
          <AlertDialogDescription>
            This restores the ₹10,000 sample budget on Day 12 and clears every committed decision, payment and goal change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my changes</AlertDialogCancel>
          <AlertDialogCancel
            variant="default"
            onClick={() => {
              reset()
              toast.success('Demo reset', { description: 'Back to Day 12 with ₹6,400 remaining.' })
            }}
          >
            Reset demo
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Header() {
  const { finance } = useFinance()
  const progress = (finance.currentDay / finance.cycleLength) * 100
  return (
    <header className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Logo className="mb-4 md:hidden" />
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">Good morning, Aditya</h1>
          <p className="mt-1 text-sm text-muted-foreground">Broke But Functional — Survive the Month</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-44 flex-col gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-medium text-foreground">
              Day {finance.currentDay} <span className="text-muted-foreground">of {finance.cycleLength}</span>
            </span>
            <span className="text-muted-foreground">{finance.cycleLength - finance.currentDay + 1} days left</span>
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Budget cycle progress"
            aria-valuenow={finance.currentDay}
            aria-valuemin={1}
            aria-valuemax={finance.cycleLength}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs">
          <p className="text-muted-foreground">Budget cycle</p>
          <p className="font-medium text-foreground">
            {formatINR(finance.startingBudget)} · {finance.cycleLength} days
          </p>
        </div>
        <ResetDemoButton />
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-8 focus:outline-none">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
