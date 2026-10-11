'use client'

import { CalendarClock, Gauge, type LucideIcon, Receipt, TrendingDown, TriangleAlert, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useFinance } from '@/lib/finance/store'
import { formatINR } from '@/lib/finance/format'
import { isUnpaid } from '@/lib/finance/calculations'
import { Meter, RiskBadge } from './primitives'

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix,
  badge,
  children,
  accent,
}: {
  icon: LucideIcon
  label: string
  value: string
  suffix?: string
  badge?: ReactNode
  children: ReactNode
  accent?: boolean
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-2xl border bg-card p-5',
        accent ? 'border-primary/30 bg-[linear-gradient(160deg,color-mix(in_oklch,var(--primary)_10%,var(--card))_0%,var(--card)_60%)]' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-foreground">
            <Icon className="size-3.5" aria-hidden />
          </span>
          {label}
        </div>
        {badge}
      </div>
      <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
        {value}
        {suffix && <span className="ml-1 font-sans text-base font-normal text-muted-foreground">{suffix}</span>}
      </p>
      <div className="mt-auto text-xs leading-relaxed text-muted-foreground">{children}</div>
    </article>
  )
}

export function SummaryCards() {
  const { plan, finance } = useFinance()
  const unpaid = finance.obligations.filter(isUnpaid).sort((a, b) => a.dueDay - b.dueDay)
  const next = unpaid[0]
  const free = Math.max(0, plan.discretionary)
  const isShortfall = plan.balance < plan.unpaidObligations

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {isShortfall && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/15 p-4 text-sm text-danger shadow-sm sm:col-span-2 xl:col-span-4"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
          <div className="flex-1">
            <p className="font-semibold text-danger">Critical Shortfall: Cash cannot cover upcoming obligations</p>
            <p className="mt-0.5 text-xs text-danger/90 leading-relaxed">
              You have {formatINR(plan.balance)} available cash, but {formatINR(plan.unpaidObligations)} in upcoming bills and commitments are due this cycle. You are {formatINR(plan.unpaidObligations - plan.balance)} short before any everyday spending.
            </p>
          </div>
        </div>
      )}

      <SummaryCard icon={Wallet} label="Available Balance" value={formatINR(plan.balance)}>
        <Meter
          className="mb-2.5"
          label={`${formatINR(plan.unpaidObligations)} for obligations, ${formatINR(plan.savingsProtected)} for savings, ${formatINR(free)} free to spend`}
          segments={[
            { label: 'obligations', value: plan.unpaidObligations, color: 'var(--caution)' },
            { label: 'savings', value: plan.savingsProtected, color: 'var(--positive)' },
            { label: 'free', value: free, color: 'var(--primary)' },
          ]}
        />
        {isShortfall ? (
          <span className="text-danger font-medium">
            {formatINR(plan.unpaidObligations - plan.balance)} shortfall on upcoming obligations.
          </span>
        ) : plan.discretionary >= 0 ? (
          <>
            <span className="text-foreground">{formatINR(plan.discretionary)}</span> free after{' '}
            {formatINR(plan.unpaidObligations)} bills and {formatINR(plan.reservedSavings)} savings.
          </>
        ) : (
          <span className="text-danger font-medium">
            {formatINR(plan.discretionary)} deficit · obligations exceed cash.
          </span>
        )}
      </SummaryCard>

      <SummaryCard icon={CalendarClock} label="Daily Allowance" value={formatINR(plan.dailyAllowance)} suffix="/day" accent>
        For the next {plan.daysRemaining} days.{' '}
        {plan.dailyAllowance < 0 ? (
          <span className="text-danger">Discretionary allowance in deficit.</span>
        ) : plan.averageDailySpend > plan.dailyAllowance ? (
          <span className="inline-flex items-center gap-1 text-caution">
            <TrendingDown className="size-3" aria-hidden />
            You averaged {formatINR(plan.averageDailySpend)}/day so far.
          </span>
        ) : (
          <span className="text-positive">You&apos;re pacing within plan.</span>
        )}
      </SummaryCard>

      <SummaryCard icon={Receipt} label="Upcoming Obligations" value={formatINR(plan.unpaidObligations)}>
        {next ? (
          <>
            {unpaid.length} unpaid · next is <span className="text-foreground">{next.name}</span> on Day {next.dueDay}
          </>
        ) : (
          'All listed obligations are paid for this cycle.'
        )}
      </SummaryCard>

      <SummaryCard
        icon={Gauge}
        label="Financial Health"
        value={String(plan.health)}
        suffix="/100"
        badge={<RiskBadge risk={plan.risk} />}
      >
        <div
          className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Financial health score"
          aria-valuenow={plan.health}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              plan.health >= 80 ? 'bg-positive' : plan.health >= 60 ? 'bg-caution' : plan.health >= 40 ? 'bg-amber-500' : 'bg-danger',
            )}
            style={{ width: `${Math.max(0, Math.min(100, plan.health))}%` }}
          />
        </div>
        Illustrative educational indicator, not a credit score.
      </SummaryCard>
    </div>
  )
}
