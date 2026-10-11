'use client'

import { Check, FlaskConical, Info, Play, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFinance } from '@/lib/finance/store'
import { PRESETS } from '@/lib/finance/data'
import { CATEGORIES, SIMULATOR_CATEGORIES } from '@/lib/finance/categories'
import { getMonthlyRecurringDelta } from '@/lib/finance/calculations'
import { formatINR, formatSignedINR } from '@/lib/finance/format'
import { getScenarioWarnings } from '@/lib/finance/insights'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CategoryIcon } from './primitives'
import { Comparison } from './comparison'

function AmountField({
  id,
  label,
  value,
  onChange,
  error,
  suffix,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error: string | null
  suffix?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn('h-10 bg-surface pl-7 font-mono tabular-nums', suffix && 'pr-16')}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

export function Simulator() {
  const {
    finance,
    plan,
    draft,
    validation,
    simulationActive,
    simulatedPlan,
    updateDraft,
    loadPreset,
    activate,
    discard,
    commit,
  } = useFinance()

  const subscriptions = finance.obligations.filter((o) => o.kind === 'subscription' && o.status !== 'cancelled')
  const hasError = Boolean(validation.oneTimeError || validation.recurringError)
  const warnings = simulatedPlan ? getScenarioWarnings(plan, simulatedPlan) : []
  const monthlyDelta = validation.scenario ? getMonthlyRecurringDelta(finance, validation.scenario) : 0

  const handleSimulate = () => {
    if (hasError) {
      toast.error('Check the amounts', { description: 'Amounts must be positive numbers under ₹1,00,000.' })
      return
    }
    if (validation.isEmpty) {
      toast.error('Nothing to simulate yet', { description: 'Add an amount or pick a subscription to cancel.' })
      return
    }
    activate()
  }

  const handleCommit = () => {
    const committed = commit()
    if (committed) {
      toast.success(`Committed: ${committed.name}`, {
        description: 'Your plan, forecast and obligations have been updated.',
      })
    }
  }

  const toggleCancel = (id: string) => {
    const next = draft.cancelIds.includes(id) ? draft.cancelIds.filter((x) => x !== id) : [...draft.cancelIds, id]
    updateDraft({ cancelIds: next })
  }

  return (
    <section
      aria-labelledby="simulator-title"
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-[0_0_0_1px_oklch(0.64_0.22_292/6%),0_24px_60px_-30px_oklch(0.64_0.22_292/45%)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--primary),transparent)]"
      />
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <FlaskConical className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="simulator-title" className="text-lg font-semibold tracking-tight sm:text-xl">
              What happens if you spend?
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Test a decision before it touches your wallet.</p>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
            simulationActive && simulatedPlan
              ? 'bg-primary/12 text-primary ring-primary/30'
              : 'bg-muted text-muted-foreground ring-border',
          )}
        >
          <span className={cn('size-1.5 rounded-full', simulationActive && simulatedPlan ? 'animate-pulse bg-primary' : 'bg-muted-foreground')} />
          {simulationActive && simulatedPlan ? 'Simulating · not committed' : 'No active simulation'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Quick presets</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => {
                const active = draft.presetId === preset.id && simulationActive
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => loadPreset(preset)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      active ? 'border-primary/50 bg-primary/10' : 'border-border bg-surface hover:border-primary/30 hover:bg-white/[0.02]',
                    )}
                  >
                    <CategoryIcon category={preset.scenario.category} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{preset.label}</span>
                      <span className={cn('block text-xs', preset.id === 'streaming' ? 'text-positive' : 'text-muted-foreground')}>
                        {preset.hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sim-name" className="text-xs text-muted-foreground">
                Decision name
              </Label>
              <Input
                id="sim-name"
                placeholder="e.g. Concert tickets"
                value={draft.name}
                onChange={(e) => updateDraft({ name: e.target.value })}
                className="h-10 bg-surface"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AmountField
                id="sim-once"
                label="One-time expense"
                value={draft.oneTimeInput}
                onChange={(v) => updateDraft({ oneTimeInput: v })}
                error={validation.oneTimeError}
              />
              <AmountField
                id="sim-recurring"
                label="Recurring (optional)"
                value={draft.recurringInput}
                onChange={(v) => updateDraft({ recurringInput: v })}
                error={validation.recurringError}
                suffix="/month"
              />
            </div>

            <fieldset>
              <legend className="mb-2 text-xs text-muted-foreground">Category</legend>
              <div className="flex flex-wrap gap-1.5">
                {SIMULATOR_CATEGORIES.map((id) => {
                  const meta = CATEGORIES[id]
                  const Icon = meta.icon
                  const selected = draft.category === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateDraft({ category: id })}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        selected ? 'border-primary/50 bg-primary/12 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden style={{ color: selected ? meta.color : undefined }} />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs text-muted-foreground">Cancel a subscription (optional)</legend>
              {subscriptions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground">
                  No active subscriptions to cancel.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {subscriptions.map((sub) => {
                    const checked = draft.cancelIds.includes(sub.id)
                    return (
                      <li key={sub.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                            checked ? 'border-positive/40 bg-positive/[0.06]' : 'border-border hover:bg-white/[0.02]',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleCancel(sub.id)}
                          />
                          <span
                            aria-hidden
                            className={cn(
                              'flex size-4 items-center justify-center rounded border',
                              checked ? 'border-positive bg-positive text-background' : 'border-input',
                            )}
                          >
                            {checked && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          <span className="flex-1 text-sm">{sub.name}</span>
                          <span className="text-right text-xs text-muted-foreground">
                            {formatINR(sub.amount)}/mo ·{' '}
                            {sub.status === 'unpaid' ? `saves this cycle` : 'paid; saves from next cycle'}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </fieldset>
          </div>

          <div className="flex flex-wrap gap-2">
            {!simulationActive ? (
              <Button onClick={handleSimulate} className="h-10 flex-1 px-4 sm:flex-none">
                <Play />
                Simulate decision
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleCommit}
                  disabled={!validation.scenario}
                  className="h-10 flex-1 bg-positive px-4 text-background hover:bg-positive/90 sm:flex-none"
                >
                  <Check />
                  Commit decision
                </Button>
                <Button variant="outline" onClick={discard} className="h-10 flex-1 px-4 sm:flex-none">
                  <X />
                  Discard
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Comparison current={plan} after={simulatedPlan} />

          {!simulatedPlan && (
            <p className="flex items-start gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              {simulationActive && validation.isEmpty
                ? 'Add an amount or choose a subscription to cancel to see the impact.'
                : simulationActive && hasError
                  ? 'Fix the highlighted amount to update the comparison.'
                  : 'Pick a preset or enter an amount, then simulate. Nothing changes until you commit.'}
            </p>
          )}

          {simulatedPlan && (
            <div className="flex flex-col gap-2">
              {validation.scenario && validation.scenario.recurring > 0 && (
                <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-primary">
                  <span className="font-semibold">Recurring expense model:</span> The first month&apos;s charge of {formatINR(validation.scenario.recurring)} is recorded once starting today in this cycle, and adds {formatINR(validation.scenario.recurring)}/mo to your ongoing recurring commitments for future cycles.
                </p>
              )}
              {monthlyDelta !== 0 && (
                <p
                  className={cn(
                    'rounded-xl px-4 py-2.5 text-sm',
                    monthlyDelta < 0 ? 'bg-positive/10 text-positive' : 'bg-caution/10 text-caution',
                  )}
                >
                  Future recurring obligations: {formatINR(plan.monthlyRecurring)}/mo → {formatINR(simulatedPlan.monthlyRecurring)}/mo (
                  {formatSignedINR(monthlyDelta)}/mo).
                  {monthlyDelta < 0 && ' Past payments are not refunded.'}
                </p>
              )}
              {simulatedPlan.discretionary < 0 && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/15 px-4 py-2.5 text-sm text-danger font-medium">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Unaffordable scenario: This decision causes a deficit of {formatINR(-simulatedPlan.discretionary)}. You will not have enough cash to cover your listed bills and protect your savings goal.
                </p>
              )}
              {warnings.map((w) => (
                <p
                  key={w.message}
                  role="alert"
                  className={cn(
                    'flex items-start gap-2 rounded-xl border px-4 py-2.5 text-sm',
                    w.tone === 'danger' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-caution/30 bg-caution/10 text-caution',
                  )}
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {w.message}
                </p>
              ))}
              {warnings.length === 0 && simulatedPlan.discretionary >= 0 && (
                <p className="flex items-start gap-2 rounded-xl border border-positive/25 bg-positive/10 px-4 py-2.5 text-sm text-positive">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Your obligations and {formatINR(simulatedPlan.reservedSavings)} savings goal stay covered.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
