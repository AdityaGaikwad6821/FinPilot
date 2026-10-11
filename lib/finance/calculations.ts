import type { FinanceState, Obligation, PlanMetrics, RiskLevel, Scenario, SurvivalForecast, Transaction } from './types'

export const RISK_THRESHOLDS = { safe: 200, tight: 100 } as const
export const MAX_AMOUNT = 100000

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const sum = (values: number[]) => values.reduce((total, v) => total + v, 0)

/**
 * Derives risk status deterministically from the financial health score:
 * - 80–100: Healthy / Low risk ('healthy')
 * - 60–79:  Tight / Moderate risk ('tight')
 * - 40–59:  Stretched / High risk ('stretched')
 * - 0–39:   Critical / Very high risk ('critical')
 * Safely clamps input and handles non-numeric/invalid values.
 */
export function getRiskFromScore(score: number): RiskLevel {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'critical'
  }
  if (score === Infinity) return 'healthy'
  if (score === -Infinity) return 'critical'
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  if (clamped >= 80) return 'healthy'
  if (clamped >= 60) return 'tight'
  if (clamped >= 40) return 'stretched'
  return 'critical'
}

/** Legacy alias pointing directly to getRiskFromScore for complete consistency */
export function getRisk(score: number): RiskLevel {
  return getRiskFromScore(score)
}

export const RISK_RANK: Record<RiskLevel, number> = {
  healthy: 3,
  comfortable: 3,
  safe: 3,
  tight: 2,
  stretched: 1,
  high: 1,
  critical: 0,
  deficit: 0,
}

export function isUnpaid(o: Obligation) {
  return o.status === 'unpaid'
}

export interface HealthScoreInput {
  balance: number
  unpaidObligations: number
  reservedSavings: number
  dailyAllowance: number
  averageDailySpend: number
  discretionary: number
}

/**
 * Illustrative educational score (0–100), not a credit score or bank rating.
 *
 * Four documented components summing to 100 pts:
 * 1. Obligation Coverage (30 pts): Does available cash cover unpaid obligations due this cycle?
 * 2. Savings Goal Protection (25 pts): Is the protected savings reserve covered after bill obligations?
 * 3. Daily Discretionary Allowance (25 pts): Spending flexibility relative to ₹200/day comfortable benchmark.
 * 4. Spending Pace & Budget Adherence (20 pts): Compares historic daily spend pace to plan allowance.
 *
 * Safety protections:
 * - Deduces proportional penalty if discretionary funds are in deficit.
 * - Critical Shortfall Guard: If balance < unpaid obligations (cannot cover mandatory bills),
 *   score is strictly capped at 39 (Critical risk) so a high score cannot hide this shortfall.
 * - Clamped strictly between 0 and 100.
 */
export function getHealthScore(
  balanceOrInput: number | HealthScoreInput,
  unpaidArg?: number,
  reservedArg?: number,
  dailyArg?: number,
  avgSpendArg?: number,
  discretionaryArg?: number,
): number {
  let balance: number
  let unpaid: number
  let reserved: number
  let daily: number
  let avgSpend: number
  let discretionary: number

  if (typeof balanceOrInput === 'object' && balanceOrInput !== null) {
    balance = balanceOrInput.balance
    unpaid = balanceOrInput.unpaidObligations
    reserved = balanceOrInput.reservedSavings
    daily = balanceOrInput.dailyAllowance
    avgSpend = balanceOrInput.averageDailySpend
    discretionary = balanceOrInput.discretionary
  } else {
    balance = balanceOrInput
    unpaid = unpaidArg ?? 0
    reserved = reservedArg ?? 0
    daily = dailyArg ?? 0
    avgSpend = avgSpendArg ?? 0
    discretionary = discretionaryArg ?? (balance - unpaid - reserved)
  }

  // Safe numeric fallbacks
  const safeBalance = Number.isFinite(balance) ? balance : 0
  const safeUnpaid = Number.isFinite(unpaid) ? Math.max(0, unpaid) : 0
  const safeReserved = Number.isFinite(reserved) ? Math.max(0, reserved) : 0
  const safeDaily = Number.isFinite(daily) ? daily : 0
  const safeAvgSpend = Number.isFinite(avgSpend) ? Math.max(0, avgSpend) : 0
  const safeDiscretionary = Number.isFinite(discretionary) ? discretionary : 0

  // 1. Obligation Coverage (30 pts)
  const obligationCoverageRatio = safeUnpaid > 0 ? clamp01(safeBalance / safeUnpaid) : 1
  const c1 = obligationCoverageRatio * 30

  // 2. Savings Goal Protection (25 pts)
  const cashAfterObligations = Math.max(0, safeBalance - safeUnpaid)
  const savingsCoverageRatio = safeReserved > 0 ? clamp01(cashAfterObligations / safeReserved) : 1
  const c2 = savingsCoverageRatio * 25

  // 3. Daily Discretionary Allowance (25 pts)
  const allowanceRatio = clamp01(Math.max(0, safeDaily) / 200)
  const c3 = allowanceRatio * 25

  // 4. Spending Pace & Budget Adherence (20 pts)
  let paceRatio = 1
  if (safeAvgSpend > 0 && safeDaily > 0) {
    paceRatio = safeAvgSpend <= safeDaily ? 1 : clamp01(safeDaily / safeAvgSpend)
  } else if (safeDaily <= 0) {
    paceRatio = 0
  }
  const c4 = paceRatio * 20

  let totalScore = c1 + c2 + c3 + c4

  // Deduct penalty if discretionary funds are in deficit
  if (safeDiscretionary < 0) {
    const deficitPenalty = Math.min(30, (Math.abs(safeDiscretionary) / 1000) * 10)
    totalScore -= deficitPenalty
  }

  // Critical Shortfall Guard: If cash cannot cover essential bills, cap score at 39 (Critical risk)
  if (safeBalance < safeUnpaid) {
    totalScore = Math.min(39, totalScore)
  }

  if (!Number.isFinite(totalScore)) return 0
  return Math.max(0, Math.min(100, Math.round(totalScore)))
}

/**
 * @param assumedDailySpend Discretionary spend per remaining day used for the month-end forecast.
 * Defaults to this plan's own allowance (i.e. you spend exactly what the plan allows).
 */
export function computePlan(state: FinanceState, assumedDailySpend?: number): PlanMetrics {
  const spentToDate = sum(state.transactions.map((t) => t.amount))
  const balance = state.startingBudget - spentToDate
  const unpaidObligations = sum(state.obligations.filter(isUnpaid).map((o) => o.amount))
  const reservedSavings = Math.max(0, state.savings.target - state.savings.transferred)
  const discretionary = balance - unpaidObligations - reservedSavings
  const daysRemaining = Math.max(0, state.cycleLength - state.currentDay + 1)
  const daysElapsed = Math.max(0, state.currentDay - 1)
  const dailyAllowance = daysRemaining > 0 ? discretionary / daysRemaining : discretionary
  const historicSpend = sum(state.transactions.filter((t) => t.day < state.currentDay).map((t) => t.amount))
  const averageDailySpend = daysElapsed > 0 ? historicSpend / daysElapsed : 0

  const savingsProtected = Math.min(reservedSavings, Math.max(0, balance - unpaidObligations))
  const savingsCoverage = reservedSavings > 0 ? savingsProtected / reservedSavings : 1

  const assumed = assumedDailySpend ?? Math.max(0, dailyAllowance)
  const monthEnd = balance - unpaidObligations - assumed * daysRemaining

  const monthlyRecurring = sum(
    state.obligations.filter((o) => o.kind === 'subscription' && o.status !== 'cancelled').map((o) => o.amount),
  )

  const health = getHealthScore({
    balance,
    unpaidObligations,
    reservedSavings,
    dailyAllowance,
    averageDailySpend,
    discretionary,
  })
  const risk = getRiskFromScore(health)

  const survival = computeSurvivalForecast(state, {
    balance,
    unpaidObligations,
    reservedSavings,
    discretionary,
    daysRemaining,
    dailyAllowance,
    averageDailySpend,
  })

  return {
    spentToDate,
    balance,
    unpaidObligations,
    reservedSavings,
    discretionary,
    daysRemaining,
    daysElapsed,
    dailyAllowance,
    averageDailySpend,
    savingsProtected,
    savingsCoverage,
    assumedDailySpend: assumed,
    monthEnd,
    monthlyRecurring,
    risk,
    health,
    survival,
  }
}

/**
 * Projects month-end survival metrics and cash-depletion timing.
 * Evaluates both:
 * 1. The plan recommendation (spending within daily allowance).
 * 2. The user's observed spending pace (burn rate based on historical transactions).
 */
export function computeSurvivalForecast(
  state: FinanceState,
  basics: {
    balance: number
    unpaidObligations: number
    reservedSavings: number
    discretionary: number
    daysRemaining: number
    dailyAllowance: number
    averageDailySpend: number
  },
): SurvivalForecast {
  const { balance, unpaidObligations, reservedSavings, discretionary, daysRemaining, dailyAllowance, averageDailySpend } = basics
  const { currentDay, cycleLength } = state

  // Edge case 1: Cycle ended
  if (daysRemaining <= 0) {
    const survives = balance >= unpaidObligations
    return {
      survivesMonthUnderPlan: survives,
      survivesMonthUnderObservedPace: survives,
      projectedDepletionDayUnderPace: null,
      projectedSavingsBreachDayUnderPace: null,
      monthEndBalanceUnderPace: balance - unpaidObligations,
      burnRatePace: averageDailySpend,
      recommendedAllowance: Math.max(0, dailyAllowance),
      status: survives ? 'surviving' : 'critical',
      headline: survives ? 'Month Complete: Budget Survived' : 'Month Complete: Obligation Shortfall',
      actionableGuidance: survives
        ? 'You reached the end of the budget cycle with all scheduled obligations covered.'
        : 'Cash balance was insufficient to settle all scheduled obligations.',
    }
  }

  // Edge case 2: Immediate critical shortfall (Cash cannot cover essential bills)
  if (balance < unpaidObligations) {
    const shortfall = unpaidObligations - balance
    return {
      survivesMonthUnderPlan: false,
      survivesMonthUnderObservedPace: false,
      projectedDepletionDayUnderPace: currentDay,
      projectedSavingsBreachDayUnderPace: currentDay,
      monthEndBalanceUnderPace: balance - unpaidObligations - averageDailySpend * daysRemaining,
      burnRatePace: averageDailySpend,
      recommendedAllowance: 0,
      status: 'critical',
      headline: `Critical Shortfall: Short by ₹${shortfall.toLocaleString('en-IN')} on Bills`,
      actionableGuidance: `Current cash (₹${balance.toLocaleString('en-IN')}) cannot cover mandatory commitments (₹${unpaidObligations.toLocaleString('en-IN')}). Immediately cancel unpaid subscriptions or adjust budget before spending anything further.`,
    }
  }

  // Day-by-day simulation under observed burn rate pace
  const unpaid = state.obligations.filter(isUnpaid)
  let simBalance = balance
  let depletionDay: number | null = null
  let savingsBreachDay: number | null = null

  for (let d = currentDay; d <= cycleLength; d++) {
    const billsToday = sum(
      unpaid.filter((o) => (o.dueDay <= currentDay ? d === currentDay : o.dueDay === d)).map((o) => o.amount),
    )
    simBalance -= (billsToday + averageDailySpend)

    if (savingsBreachDay === null && simBalance < reservedSavings && reservedSavings > 0) {
      savingsBreachDay = d
    }
    if (depletionDay === null && simBalance < 0) {
      depletionDay = d
    }
  }

  const survivesMonthUnderPlan = discretionary >= 0
  const survivesMonthUnderObservedPace = depletionDay === null

  let status: 'surviving' | 'at-risk' | 'critical' = 'surviving'
  let headline = ''
  let actionableGuidance = ''

  if (depletionDay !== null) {
    status = 'at-risk'
    headline = `Cash Runs Out on Day ${depletionDay} at Current Pace`
    actionableGuidance = `You are spending ₹${Math.round(averageDailySpend)}/day. At this pace, rent and upcoming bills will deplete your cash on Day ${depletionDay}. Slow down to the recommended ₹${Math.round(Math.max(0, dailyAllowance))}/day to survive through Day ${cycleLength}.`
  } else if (savingsBreachDay !== null) {
    status = 'at-risk'
    headline = `Savings Goal Breached on Day ${savingsBreachDay} at Current Pace`
    actionableGuidance = `You will survive the month, but your ₹${reservedSavings.toLocaleString('en-IN')} savings reserve will be breached by Day ${savingsBreachDay}. Trim daily spending by ₹${Math.round(Math.max(0, averageDailySpend - dailyAllowance))}/day to protect your savings.`
  } else if (discretionary < 0) {
    status = 'at-risk'
    headline = `Discretionary Deficit of ₹${Math.abs(discretionary).toLocaleString('en-IN')}`
    actionableGuidance = `Freeze discretionary spending (limit to ₹0/day) so you have enough cash to cover upcoming bills of ₹${unpaidObligations.toLocaleString('en-IN')}.`
  } else {
    status = 'surviving'
    headline = `On Track to Survive Month (Day 1 to ${cycleLength})`
    actionableGuidance = `Stick to ₹${Math.round(dailyAllowance)}/day discretionary allowance to reach Day ${cycleLength} with ₹${reservedSavings.toLocaleString('en-IN')} saved and all bills paid.`
  }

  return {
    survivesMonthUnderPlan,
    survivesMonthUnderObservedPace,
    projectedDepletionDayUnderPace: depletionDay,
    projectedSavingsBreachDayUnderPace: savingsBreachDay,
    monthEndBalanceUnderPace: simBalance,
    burnRatePace: averageDailySpend,
    recommendedAllowance: Math.max(0, dailyAllowance),
    status,
    headline,
    actionableGuidance,
  }
}

/**
 * Pure state transition for a decision. Used both to preview (simulate) and to commit,
 * so the simulation and the committed result can never disagree.
 * Cancellations only stop future charges; already-paid amounts are not refunded.
 */
export function applyScenario(state: FinanceState, scenario: Scenario): FinanceState {
  const day = state.currentDay
  const transactions = [...state.transactions]
  let obligations = state.obligations.map((o) =>
    scenario.cancelIds.includes(o.id) && o.kind === 'subscription' && o.status !== 'cancelled'
      ? { ...o, status: 'cancelled' as const }
      : o,
  )

  if (scenario.oneTime > 0) {
    transactions.push({
      id: `${scenario.id}-once`,
      description: scenario.name,
      amount: scenario.oneTime,
      day,
      category: scenario.category,
    })
  }

  if (scenario.recurring > 0) {
    transactions.push({
      id: `${scenario.id}-recurring`,
      description: `${scenario.name} · first month`,
      amount: scenario.recurring,
      day,
      category: scenario.category,
    })
    obligations = [
      ...obligations,
      {
        id: `${scenario.id}-sub`,
        name: scenario.name,
        amount: scenario.recurring,
        dueDay: day,
        kind: 'subscription',
        category: scenario.category,
        status: 'paid',
        paidDay: day,
      },
    ]
  }

  return {
    ...state,
    transactions,
    obligations,
    committedScenarioIds: [...state.committedScenarioIds, scenario.id],
  }
}

export function markObligationPaid(state: FinanceState, id: string): FinanceState {
  const target = state.obligations.find((o) => o.id === id)
  if (!target || target.status !== 'unpaid') return state
  const alreadyRecorded = state.transactions.some((t) => t.id === `pay-${id}`)
  return {
    ...state,
    obligations: state.obligations.map((o) =>
      o.id === id ? { ...o, status: 'paid' as const, paidDay: state.currentDay } : o,
    ),
    transactions: alreadyRecorded
      ? state.transactions
      : [
          ...state.transactions,
          {
            id: `pay-${id}`,
            description: `${target.name} payment`,
            amount: target.amount,
            day: state.currentDay,
            category: target.category,
          },
        ],
  }
}

export function unmarkObligationPaid(state: FinanceState, id: string): FinanceState {
  const target = state.obligations.find((o) => o.id === id)
  if (!target || target.status !== 'paid') return state
  return {
    ...state,
    obligations: state.obligations.map((o) =>
      o.id === id ? { ...o, status: 'unpaid' as const, paidDay: undefined } : o,
    ),
    transactions: state.transactions.filter((t) => t.id !== `pay-${id}`),
  }
}

export function cancelSubscription(state: FinanceState, id: string): FinanceState {
  const target = state.obligations.find((o) => o.id === id && o.kind === 'subscription')
  if (!target || target.status === 'cancelled') return state
  return {
    ...state,
    obligations: state.obligations.map((o) =>
      o.id === id ? { ...o, status: 'cancelled' as const } : o,
    ),
  }
}

export function resumeSubscription(state: FinanceState, id: string): FinanceState {
  const target = state.obligations.find((o) => o.id === id && o.kind === 'subscription')
  if (!target || target.status !== 'cancelled') return state
  return {
    ...state,
    obligations: state.obligations.map((o) =>
      o.id === id ? { ...o, status: target.paidDay !== undefined ? ('paid' as const) : ('unpaid' as const) } : o,
    ),
  }
}

export function addTransaction(state: FinanceState, tx: Transaction): FinanceState {
  return { ...state, transactions: [tx, ...state.transactions] }
}

export function editTransaction(state: FinanceState, id: string, patch: Partial<Omit<Transaction, 'id'>>): FinanceState {
  return {
    ...state,
    transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }
}

export function deleteTransaction(state: FinanceState, id: string): FinanceState {
  return { ...state, transactions: state.transactions.filter((t) => t.id !== id) }
}

export function addObligation(state: FinanceState, obligation: Obligation): FinanceState {
  return { ...state, obligations: [...state.obligations, obligation] }
}

export function editObligation(state: FinanceState, id: string, patch: Partial<Omit<Obligation, 'id'>>): FinanceState {
  return {
    ...state,
    obligations: state.obligations.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  }
}

export function deleteObligation(state: FinanceState, id: string): FinanceState {
  return {
    ...state,
    obligations: state.obligations.filter((o) => o.id !== id),
    transactions: state.transactions.filter((t) => t.id !== `pay-${id}`),
  }
}

export interface SettingsPatch {
  startingBudget?: number
  currentDay?: number
  cycleLength?: number
  savingsTarget?: number
}

export function updateFinanceSettings(state: FinanceState, patch: SettingsPatch): FinanceState {
  const cycleLength = patch.cycleLength !== undefined ? Math.max(1, patch.cycleLength) : state.cycleLength
  const currentDay = patch.currentDay !== undefined ? Math.min(Math.max(1, patch.currentDay), cycleLength) : state.currentDay
  const startingBudget = patch.startingBudget !== undefined ? Math.max(0, patch.startingBudget) : state.startingBudget
  const target = patch.savingsTarget !== undefined ? Math.max(0, patch.savingsTarget) : state.savings.target
  return {
    ...state,
    startingBudget,
    cycleLength,
    currentDay,
    savings: { ...state.savings, target },
  }
}

/** Monthly recurring change from a scenario (positive = more spending each month). */
export function getMonthlyRecurringDelta(state: FinanceState, scenario: Scenario) {
  const cancelled = sum(
    state.obligations
      .filter((o) => scenario.cancelIds.includes(o.id) && o.kind === 'subscription' && o.status !== 'cancelled')
      .map((o) => o.amount),
  )
  return scenario.recurring - cancelled
}

export interface RunwayPoint {
  day: number
  current: number
  simulated: number | null
}

function balanceSeries(state: FinanceState, assumedDailySpend: number) {
  const series: number[] = []
  const historic = (d: number) =>
    state.startingBudget - sum(state.transactions.filter((t) => t.day <= d).map((t) => t.amount))
  const balanceNow = state.startingBudget - sum(state.transactions.map((t) => t.amount))
  const unpaid = state.obligations.filter(isUnpaid)
  const totalFutureSteps = Math.max(1, state.cycleLength - state.currentDay)
  const daysRemaining = Math.max(0, state.cycleLength - state.currentDay + 1)
  const totalFutureDiscretionary = assumedDailySpend * daysRemaining

  for (let day = 1; day <= state.cycleLength; day++) {
    if (day < state.currentDay) {
      series.push(historic(day))
      continue
    }
    if (day === state.currentDay) {
      // Current day anchor strictly matches current available balance
      series.push(balanceNow)
      continue
    }
    const step = day - state.currentDay
    const obligationsDue = sum(
      unpaid.filter((o) => o.dueDay <= day).map((o) => o.amount),
    )
    const discretionarySpent = (step / totalFutureSteps) * totalFutureDiscretionary
    series.push(balanceNow - obligationsDue - discretionarySpent)
  }
  return series
}

/** End-of-day balances. Future days assume the current plan's daily allowance is spent. */
export function buildRunway(current: FinanceState, simulated: FinanceState | null): RunwayPoint[] {
  const assumed = computePlan(current).assumedDailySpend
  const currentSeries = balanceSeries(current, assumed)
  const simulatedSeries = simulated ? balanceSeries(simulated, assumed) : null

  return currentSeries.map((value, i) => {
    const day = i + 1
    let sim: number | null = null
    if (simulatedSeries) {
      if (day === current.currentDay - 1) sim = value
      else if (day >= current.currentDay) sim = simulatedSeries[i]
    }
    return { day, current: Math.round(value), simulated: sim === null ? null : Math.round(sim) }
  })
}

export interface ParsedAmount {
  value: number
  error: string | null
}

export function parseAmount(input: string): ParsedAmount {
  const trimmed = input.replace(/[,₹\s]/g, '')
  if (trimmed === '') return { value: 0, error: null }
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { value: 0, error: 'Enter a positive amount in rupees.' }
  const value = Number(trimmed)
  if (value > MAX_AMOUNT) return { value: 0, error: 'Keep it under ₹1,00,000 for this budget.' }
  return { value, error: null }
}

export interface Warning {
  tone: 'danger' | 'caution'
  message: string
}
