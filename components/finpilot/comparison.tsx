'use client'

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RISK_RANK } from '@/lib/finance/calculations'
import { formatINR, formatSignedINR } from '@/lib/finance/format'
import type { PlanMetrics } from '@/lib/finance/types'
import { RiskBadge } from './primitives'

type Tone = 'better' | 'caution' | 'danger' | 'same'

interface Row {
  key: string
  label: string
  hint?: string
  render: (p: PlanMetrics) => React.ReactNode
  value: (p: PlanMetrics) => number
  delta?: (before: PlanMetrics, after: PlanMetrics) => string
  reverseTone?: boolean
}

function buildRows(assumedDaily: number): Row[] {
  return [
    {
      key: 'balance',
      label: 'Remaining cash',
      render: (p) => formatINR(p.balance),
      value: (p) => p.balance,
      delta: (b, a) => formatSignedINR(a.balance - b.balance),
    },
    {
      key: 'unpaid',
      label: 'Unpaid obligations',
      render: (p) => formatINR(p.unpaidObligations),
      value: (p) => p.unpaidObligations,
      delta: (b, a) => formatSignedINR(a.unpaidObligations - b.unpaidObligations),
      reverseTone: true,
    },
    {
      key: 'discretionary',
      label: 'Discretionary funds',
      render: (p) => formatINR(p.discretionary),
      value: (p) => p.discretionary,
      delta: (b, a) => formatSignedINR(a.discretionary - b.discretionary),
    },
    {
      key: 'daily',
      label: 'Daily allowance',
      render: (p) => `${formatINR(p.dailyAllowance)}/day`,
      value: (p) => Math.round(p.dailyAllowance),
      delta: (b, a) => `${formatSignedINR(a.dailyAllowance - b.dailyAllowance)}/day`,
    },
    {
      key: 'savings',
      label: 'Savings goal protected',
      render: (p) => `${Math.round(p.savingsCoverage * 100)}%`,
      value: (p) => Math.round(p.savingsCoverage * 100),
      delta: (b, a) => `${Math.round((a.savingsCoverage - b.savingsCoverage) * 100)} pts`,
    },
    {
      key: 'monthEnd',
      label: 'Projected month-end cash',
      hint: `Assumes ${formatINR(assumedDaily)}/day spending continues`,
      render: (p) => formatINR(p.monthEnd),
      value: (p) => Math.round(p.monthEnd),
      delta: (b, a) => formatSignedINR(a.monthEnd - b.monthEnd),
    },
    {
      key: 'risk',
      label: 'Financial risk',
      render: (p) => <RiskBadge risk={p.risk} />,
      value: (p) => RISK_RANK[p.risk],
    },
    {
      key: 'health',
      label: 'Health score',
      hint: 'Illustrative indicator',
      render: (p) => `${p.health}/100`,
      value: (p) => p.health,
      delta: (b, a) => `${a.health - b.health > 0 ? '+' : ''}${a.health - b.health}`,
    },
  ]
}

function toneFor(before: number, after: number, afterPlan: PlanMetrics, reverseTone?: boolean): Tone {
  if (after === before) return 'same'
  if (reverseTone) {
    if (after < before) return 'better'
    return afterPlan.risk === 'high' || afterPlan.risk === 'deficit' ? 'danger' : 'caution'
  }
  if (after > before) return 'better'
  return afterPlan.risk === 'high' || afterPlan.risk === 'deficit' || afterPlan.monthEnd < 0 ? 'danger' : 'caution'
}

const toneClass: Record<Tone, string> = {
  better: 'text-positive bg-positive/10',
  caution: 'text-caution bg-caution/10',
  danger: 'text-danger bg-danger/10',
  same: 'text-muted-foreground bg-muted',
}

function DeltaChip({ tone, text }: { tone: Tone; text?: string }) {
  const Icon = tone === 'better' ? ArrowUpRight : tone === 'same' ? Minus : ArrowDownRight
  const srTone = tone === 'better' ? 'improves' : tone === 'same' ? 'no change' : 'worsens'
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums', toneClass[tone])}>
      <Icon className="size-3" aria-hidden />
      <span className="sr-only">{srTone}: </span>
      {tone === 'same' ? 'No change' : text ?? (tone === 'better' ? 'Better' : 'Worse')}
    </span>
  )
}

function PlanColumn({
  title,
  rows,
  plan,
  before,
  highlight,
}: {
  title: string
  rows: Row[]
  plan: PlanMetrics | null
  before?: PlanMetrics
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border p-4',
        highlight && plan ? 'border-primary/40 bg-primary/[0.04]' : 'border-border bg-surface',
      )}
    >
      <h3 className={cn('text-[11px] font-semibold tracking-[0.14em]', highlight ? 'text-primary' : 'text-muted-foreground')}>
        {title}
      </h3>
      <dl className="mt-3 flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const tone = plan && before ? toneFor(row.value(before), row.value(plan), plan, row.reverseTone) : null
          return (
            <div key={row.key} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="min-w-0 text-sm text-muted-foreground">
                {row.label}
                {row.hint && <span className="block text-[11px] text-muted-foreground/70">{row.hint}</span>}
              </dt>
              <dd className="flex flex-col items-end gap-1 text-right">
                {plan ? (
                  <>
                    <span className="font-mono text-sm font-medium tabular-nums text-foreground">{row.render(plan)}</span>
                    {tone && before && <DeltaChip tone={tone} text={row.delta?.(before, plan)} />}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground/60">—</span>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

export function Comparison({ current, after }: { current: PlanMetrics; after: PlanMetrics | null }) {
  const rows = buildRows(current.assumedDailySpend)
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-live="polite">
      <PlanColumn title="CURRENT PLAN" rows={rows} plan={current} />
      <PlanColumn title="AFTER THIS DECISION" rows={rows} plan={after} before={current} highlight />
    </div>
  )
}
