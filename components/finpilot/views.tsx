'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useFinance } from '@/lib/finance/store'
import { formatINR } from '@/lib/finance/format'
import { parseAmount, RISK_THRESHOLDS } from '@/lib/finance/calculations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResetDemoButton } from './app-shell'
import { Commitments } from './commitments'
import { Panel, PanelHeader } from './primitives'
import { RunwayChart } from './runway-chart'
import { Insights, SavingsGoalCard } from './savings-insights'
import { Simulator } from './simulator'
import { CategoryBreakdown, Transactions } from './spending'
import { SummaryCards } from './summary-cards'

function OverviewView() {
  return (
    <div className="flex flex-col gap-6">
      <SummaryCards />
      <Simulator />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RunwayChart />
        </div>
        <Insights />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Commitments compact />
        <SavingsGoalCard />
        <Transactions limit={6} />
      </div>
    </div>
  )
}

function SettingsView() {
  const { finance, updateSettings } = useFinance()

  const [startingBudget, setStartingBudget] = useState(String(finance.startingBudget))
  const [cycleLength, setCycleLength] = useState(String(finance.cycleLength))
  const [currentDay, setCurrentDay] = useState(String(finance.currentDay))
  const [savingsTarget, setSavingsTarget] = useState(String(finance.savings.target))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    const parsedBudget = parseAmount(startingBudget)
    if (parsedBudget.error || parsedBudget.value <= 0) {
      newErrors.startingBudget = parsedBudget.error || 'Enter a budget greater than ₹0.'
    }

    const parsedCycle = Number(cycleLength)
    if (!Number.isInteger(parsedCycle) || parsedCycle < 1 || parsedCycle > 365) {
      newErrors.cycleLength = 'Cycle length must be between 1 and 365 days.'
    }

    const parsedDay = Number(currentDay)
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || (parsedCycle && parsedDay > parsedCycle)) {
      newErrors.currentDay = `Current day must be between 1 and ${parsedCycle || 30}.`
    }

    const parsedSavings = parseAmount(savingsTarget)
    if (parsedSavings.error) {
      newErrors.savingsTarget = parsedSavings.error
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    updateSettings({
      startingBudget: parsedBudget.value,
      cycleLength: parsedCycle,
      currentDay: parsedDay,
      savingsTarget: parsedSavings.value,
    })

    toast.success('Settings updated', {
      description: `Starting budget: ${formatINR(parsedBudget.value)} · Day ${parsedDay} of ${parsedCycle} days.`,
    })
  }

  const handleResetToCurrent = () => {
    setStartingBudget(String(finance.startingBudget))
    setCycleLength(String(finance.cycleLength))
    setCurrentDay(String(finance.currentDay))
    setSavingsTarget(String(finance.savings.target))
    setErrors({})
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel aria-labelledby="settings-title">
        <PanelHeader
          id="settings-title"
          title="Customize budget parameters"
          description="Edit your financial situation to see how FinPilot recalculates your plan in real-time."
        />

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="set-budget" className="text-xs text-muted-foreground">
                Starting budget (₹)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  id="set-budget"
                  inputMode="decimal"
                  value={startingBudget}
                  onChange={(e) => setStartingBudget(e.target.value)}
                  className="h-10 bg-surface pl-7 font-mono tabular-nums"
                />
              </div>
              {errors.startingBudget && <p className="text-xs text-danger">{errors.startingBudget}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="set-savings" className="text-xs text-muted-foreground">
                Monthly savings target (₹)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  id="set-savings"
                  inputMode="decimal"
                  value={savingsTarget}
                  onChange={(e) => setSavingsTarget(e.target.value)}
                  className="h-10 bg-surface pl-7 font-mono tabular-nums"
                />
              </div>
              {errors.savingsTarget && <p className="text-xs text-danger">{errors.savingsTarget}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="set-day" className="text-xs text-muted-foreground">
                Current day of cycle
              </Label>
              <Input
                id="set-day"
                type="number"
                min={1}
                max={Number(cycleLength) || 30}
                value={currentDay}
                onChange={(e) => setCurrentDay(e.target.value)}
                className="h-10 bg-surface font-mono tabular-nums"
              />
              {errors.currentDay && <p className="text-xs text-danger">{errors.currentDay}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="set-cycle" className="text-xs text-muted-foreground">
                Total cycle length (days)
              </Label>
              <Input
                id="set-cycle"
                type="number"
                min={1}
                max={365}
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="h-10 bg-surface font-mono tabular-nums"
              />
              {errors.cycleLength && <p className="text-xs text-danger">{errors.cycleLength}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" className="h-10 px-5">
              Apply changes
            </Button>
            <Button type="button" variant="outline" onClick={handleResetToCurrent} className="h-10">
              Discard unsaved
            </Button>
          </div>
        </form>

        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-medium text-foreground">Reset demo data</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Want to start over with the original ₹10,000 Day 12 scenario? This clears all local modifications and restored defaults.
          </p>
          <div className="mt-4">
            <ResetDemoButton variant="default" />
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="benchmarks-title">
          <PanelHeader id="benchmarks-title" title="Financial health score thresholds" description="Deterministic risk bands directly derived from your health score (0–100)." />
          <dl className="divide-y divide-border">
            <div className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">Healthy / Low risk</dt>
              <dd className="font-mono tabular-nums text-positive">80–100</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">Tight / Moderate risk</dt>
              <dd className="font-mono tabular-nums text-caution">60–79</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">Stretched / High risk</dt>
              <dd className="font-mono tabular-nums text-amber-400">40–59</dd>
            </div>
            <div className="flex justify-between gap-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">Critical / Very high risk</dt>
              <dd className="font-mono tabular-nums text-danger">0–39</dd>
            </div>
          </dl>
        </Panel>

        <Panel aria-labelledby="method-title">
          <PanelHeader id="method-title" title="Financial model principles" description="How numbers reconcile across the application." />
          <ul className="flex list-disc flex-col gap-2.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Remaining Cash:</strong> Starting budget minus recorded transactions to date. Editing the starting budget adjusts cash without modifying transaction history.
            </li>
            <li>
              <strong className="text-foreground">Unpaid Obligations:</strong> Sum of upcoming bills and unpaid subscriptions due in this cycle.
            </li>
            <li>
              <strong className="text-foreground">Discretionary Funds:</strong> Remaining cash minus unpaid obligations minus protected savings.
            </li>
            <li>
              <strong className="text-foreground">Daily Discretionary Allowance:</strong> Discretionary funds divided by remaining days in cycle (including today).
            </li>
            <li>
              <strong className="text-foreground">Subscription Rules:</strong> Cancelling an unpaid subscription avoids the charge this cycle. Cancelling an already-paid subscription takes effect next cycle without refunding past charges.
            </li>
            <li>
              <strong className="text-foreground">Illustrative Health Score (Four Components):</strong>
              Evaluates (1) Obligation Coverage (30 pts), (2) Savings Goal Protection (25 pts), (3) Daily Discretionary Allowance relative to ₹200/day (25 pts), and (4) Spending Pace vs. Allowed Pace (20 pts).
            </li>
            <li>
              <strong className="text-foreground">Critical Shortfall Guard:</strong> If cash cannot cover essential bills, the health score is strictly capped at ≤ 39 (Critical risk) and a prominent shortfall alert is displayed.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  )
}

export function CurrentView() {
  const { view } = useFinance()
  switch (view) {
    case 'overview':
      return <OverviewView />
    case 'spending':
      return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CategoryBreakdown />
          <Transactions />
        </div>
      )
    case 'commitments':
      return <Commitments />
    case 'savings':
      return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SavingsGoalCard editable />
          <Insights />
        </div>
      )
    case 'simulator':
      return (
        <div className="flex flex-col gap-6">
          <Simulator />
          <RunwayChart />
        </div>
      )
    case 'settings':
      return <SettingsView />
  }
}
