import { applyScenario, computePlan, isUnpaid, type Warning } from './calculations'
import { formatINR } from './format'
import type { FinanceState, PlanMetrics } from './types'

export function getScenarioWarnings(current: PlanMetrics, after: PlanMetrics): Warning[] {
  const warnings: Warning[] = []
  const daily = formatINR(current.assumedDailySpend)

  if (after.balance < after.unpaidObligations) {
    warnings.push({
      tone: 'danger',
      message: `Your balance wouldn't cover listed unpaid obligations — you'd be ${formatINR(
        after.unpaidObligations - after.balance,
      )} short before any everyday spending.`,
    })
  } else if (after.discretionary < 0) {
    warnings.push({
      tone: 'danger',
      message: `This dips ${formatINR(-after.discretionary)} into your ${formatINR(
        after.reservedSavings,
      )} savings reserve, leaving no daily spending money.`,
    })
  }

  if (after.monthEnd < after.reservedSavings) {
    const keepUnder = Math.max(0, after.dailyAllowance)
    warnings.push({
      tone: after.monthEnd < 0 ? 'danger' : 'caution',
      message:
        after.monthEnd < 0
          ? `If you keep spending ${daily}/day, you'd end the month at ${formatINR(after.monthEnd)} and miss your savings goal entirely.`
          : `If you keep spending ${daily}/day, you'd finish ${formatINR(
              after.reservedSavings - after.monthEnd,
            )} short of your savings goal.`,
    })
    if (keepUnder > 0) {
      warnings.push({
        tone: 'caution',
        message: `To protect your goal, keep everyday spending under ${formatINR(keepUnder)}/day for the next ${
          after.daysRemaining
        } days.`,
      })
    }
  }

  return warnings
}

export interface Insight {
  id: string
  tone: 'neutral' | 'positive' | 'caution' | 'danger'
  text: string
}

export function getInsights(state: FinanceState, plan: PlanMetrics, simulated: PlanMetrics | null): Insight[] {
  const insights: Insight[] = []

  // Independent critical warning: High score must not hide shortfall
  if (plan.balance < plan.unpaidObligations) {
    insights.push({
      id: 'critical-shortfall',
      tone: 'danger',
      text: `Critical Shortfall: Your available cash (${formatINR(plan.balance)}) cannot cover upcoming unpaid bills (${formatINR(plan.unpaidObligations)}). You are ${formatINR(plan.unpaidObligations - plan.balance)} short before any everyday spending.`,
    })
  }

  insights.push({
    id: 'allowance',
    tone: plan.risk === 'healthy' || plan.risk === 'comfortable' || plan.risk === 'safe' ? 'positive' : plan.risk === 'tight' ? 'caution' : 'danger',
    text: `Your daily discretionary allowance is approximately ${formatINR(plan.dailyAllowance)} for the remaining ${
      plan.daysRemaining
    } days.`,
  })

  insights.push({
    id: 'leftover',
    tone: plan.discretionary >= 0 ? 'neutral' : 'danger',
    text:
      plan.discretionary >= 0
        ? `Your current plan leaves ${formatINR(plan.discretionary)} after accounting for listed unpaid obligations and your savings target.`
        : `Your listed obligations and savings target exceed your balance by ${formatINR(-plan.discretionary)}.`,
  })

  if (plan.averageDailySpend > 0 && plan.dailyAllowance > 0) {
    const ratio = plan.averageDailySpend / plan.dailyAllowance
    insights.push({
      id: 'pace',
      tone: ratio > 1.1 ? 'caution' : 'positive',
      text:
        ratio > 1.1
          ? `You averaged ${formatINR(plan.averageDailySpend)}/day over the first ${plan.daysElapsed} days — about ${ratio.toFixed(
              1,
            )}× what your plan now allows.`
          : `Your spending pace of ${formatINR(plan.averageDailySpend)}/day is within your plan.`,
    })
  }

  if (simulated) {
    const delta = simulated.dailyAllowance - plan.dailyAllowance
    insights.push({
      id: 'scenario',
      tone: delta >= 0 ? 'positive' : simulated.risk === 'critical' || simulated.risk === 'stretched' || simulated.risk === 'high' ? 'danger' : 'caution',
      text: `Your simulated decision moves your daily allowance from ${formatINR(plan.dailyAllowance)} to ${formatINR(
        simulated.dailyAllowance,
      )}.`,
    })
  } else {
    const shock = computePlan(
      applyScenario(state, { id: 'insight-shock', name: 'Shock', oneTime: 2500, recurring: 0, category: 'repairs', cancelIds: [] }),
    )
    insights.push({
      id: 'shock',
      tone: 'caution',
      text: `A ₹2,500 unexpected expense would cut your daily allowance to ${formatINR(
        shock.dailyAllowance,
      )} — significantly reducing your spending flexibility.`,
    })
  }

  const eligible = state.obligations.filter((o) => o.kind === 'subscription' && isUnpaid(o) && o.dueDay >= state.currentDay)
  if (eligible.length > 0) {
    const total = eligible.reduce((s, o) => s + o.amount, 0)
    insights.push({
      id: 'subscriptions',
      tone: 'positive',
      text: `Cancelling ${eligible.map((o) => o.name).join(' and ')} before ${
        eligible.length > 1 ? 'their' : 'its'
      } due date could free up ${formatINR(total)} per month, starting this cycle.`,
    })
  }

  const nextDue = state.obligations
    .filter(isUnpaid)
    .sort((a, b) => a.dueDay - b.dueDay)
    .find(() => true)
  if (nextDue) {
    const inDays = nextDue.dueDay - state.currentDay
    insights.push({
      id: 'next-due',
      tone: inDays < 0 ? 'danger' : 'neutral',
      text:
        inDays < 0
          ? `${nextDue.name} (${formatINR(nextDue.amount)}) is overdue since Day ${nextDue.dueDay}.`
          : `${nextDue.name} (${formatINR(nextDue.amount)}) is your next payment, due ${
              inDays === 0 ? 'today' : `in ${inDays} day${inDays === 1 ? '' : 's'}`
            } on Day ${nextDue.dueDay}.`,
    })
  }

  return insights
}
