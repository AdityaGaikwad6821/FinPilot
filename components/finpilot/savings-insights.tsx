'use client'

import { useState } from 'react'
import { CircleAlert, CircleCheck, Lightbulb, PiggyBank, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFinance } from '@/lib/finance/store'
import { formatINR } from '@/lib/finance/format'
import { getInsights, type Insight } from '@/lib/finance/insights'
import { parseAmount } from '@/lib/finance/calculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Panel, PanelHeader } from './primitives'

export function SavingsGoalCard({ editable = false }: { editable?: boolean }) {
  const { finance, plan, setSavingsTarget } = useFinance()
  const [input, setInput] = useState(String(finance.savings.target))
  const [error, setError] = useState<string | null>(null)
  const pct = Math.round(plan.savingsCoverage * 100)
  const shortfall = Math.max(0, plan.reservedSavings - Math.max(0, plan.monthEnd))

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseAmount(input)
    if (parsed.error) return setError(parsed.error)
    setError(null)
    setSavingsTarget(parsed.value)
    toast.success('Savings goal updated', { description: `New target: ${formatINR(parsed.value)} this cycle.` })
  }

  return (
    <Panel aria-labelledby="savings-title">
      <PanelHeader
        id="savings-title"
        title="Savings goal"
        description="Money set aside first, before daily spending."
        action={
          <span className="flex size-9 items-center justify-center rounded-xl bg-positive/12 text-positive">
            <PiggyBank className="size-4" aria-hidden />
          </span>
        }
      />
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-3xl font-semibold tabular-nums">{formatINR(plan.savingsProtected)}</p>
        <p className="pb-1 text-sm text-muted-foreground">of {formatINR(plan.reservedSavings)} protected</p>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Savings goal protected"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', pct >= 100 ? 'bg-positive' : 'bg-caution')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn('mt-3 text-sm', shortfall > 0 ? 'text-caution' : 'text-muted-foreground')}>
        {shortfall > 0
          ? `At your current pace you'd end ${formatINR(shortfall)} short of this goal.`
          : 'Your goal is on track if you stay within your daily allowance.'}
      </p>

      <div className="mt-4 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Planned reservation vs transferred cash</p>
        <p className="mt-1 leading-relaxed">
          Your savings goal is a planned buffer protected first out of remaining cash ({formatINR(plan.balance)}) before calculating discretionary funds. It is not counted as spent money.
        </p>
        <p className="mt-1 text-primary">
          Impact: Each ₹500 change in your goal alters your daily discretionary allowance by approximately {formatINR(500 / Math.max(1, plan.daysRemaining))}/day over your remaining {plan.daysRemaining} days.
        </p>
      </div>

      {editable && (
        <form onSubmit={save} className="mt-5 flex flex-col gap-1.5 border-t border-border pt-5">
          <Label htmlFor="savings-target" className="text-xs text-muted-foreground">
            Monthly savings target (₹)
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                id="savings-target"
                inputMode="decimal"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'savings-target-error' : undefined}
                className="h-10 bg-surface pl-7 font-mono tabular-nums"
              />
            </div>
            <Button type="submit" className="h-10">
              Update goal
            </Button>
          </div>
          {error && (
            <p id="savings-target-error" className="text-xs text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </Panel>
  )
}

const insightIcon: Record<Insight['tone'], typeof Lightbulb> = {
  neutral: Lightbulb,
  positive: CircleCheck,
  caution: TriangleAlert,
  danger: CircleAlert,
}
const insightColor: Record<Insight['tone'], string> = {
  neutral: 'text-primary bg-primary/12',
  positive: 'text-positive bg-positive/12',
  caution: 'text-caution bg-caution/12',
  danger: 'text-danger bg-danger/12',
}

export function Insights() {
  const { finance, plan, simulatedPlan } = useFinance()
  const insights = getInsights(finance, plan, simulatedPlan)
  return (
    <Panel aria-labelledby="insights-title">
      <PanelHeader id="insights-title" title="Smart insights" description="Generated from your live numbers." />
      <ul className="flex flex-col gap-3" aria-live="polite">
        {insights.map((i) => {
          const Icon = insightIcon[i.tone]
          return (
            <li key={i.id} className="flex items-start gap-3">
              <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg', insightColor[i.tone])}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              <p className="text-sm leading-relaxed text-foreground/90">{i.text}</p>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
