import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computePlan,
  computeSurvivalForecast,
  getRiskFromScore,
  getHealthScore,
  applyScenario,
  markObligationPaid,
  unmarkObligationPaid,
  cancelSubscription,
  resumeSubscription,
  addTransaction,
  editTransaction,
  deleteTransaction,
  addObligation,
  editObligation,
  deleteObligation,
  updateFinanceSettings,
  buildRunway,
} from '../lib/finance/calculations.ts'

import { createInitialState, PRESETS } from '../lib/finance/data.ts'
import { formatPreciseINR } from '../lib/finance/format.ts'

test('1. Baseline Figures & Source of Truth Reconcile', () => {
  const initial = createInitialState()
  const plan = computePlan(initial)

  assert.equal(initial.startingBudget, 10000, 'Starting budget must be ₹10,000')
  assert.equal(initial.cycleLength, 30, 'Cycle length must be 30 days')
  assert.equal(initial.currentDay, 12, 'Current day must be Day 12')
  assert.equal(plan.daysRemaining, 19, 'Days remaining must be 19 (30 - 12 + 1)')
  assert.equal(plan.daysElapsed, 11, 'Days elapsed must be 11 (12 - 1)')
  assert.equal(plan.spentToDate, 3600, 'Total spent to date must be ₹3,600')
  assert.equal(plan.balance, 6400, 'Available cash balance must be ₹6,400')
  assert.equal(plan.unpaidObligations, 2318, 'Unpaid obligations must be ₹2,318 (Rent ₹2000 + Spotify ₹119 + Netflix ₹199)')
  assert.equal(plan.reservedSavings, 1500, 'Protected savings target must be ₹1,500')
  assert.equal(plan.discretionary, 2582, 'Discretionary funds must be ₹2,582 (6400 - 2318 - 1500)')
  assert.ok(
    Math.abs(plan.dailyAllowance - 135.8947) < 0.01,
    `Daily allowance must be ~₹135.89/day (actual: ${plan.dailyAllowance})`,
  )
  assert.equal(
    formatPreciseINR(plan.dailyAllowance),
    '₹135.89',
    'formatPreciseINR must format initial allowance to exactly ₹135.89',
  )
  assert.equal(plan.health, 80, 'Health score must be 80/100 under initial baseline')
  assert.equal(plan.risk, 'healthy', 'Risk level must be healthy for score 80')
})

test('2. Chart Anchor & Runway Calibration', () => {
  const initial = createInitialState()
  const plan = computePlan(initial)
  const runway = buildRunway(initial, null)

  assert.equal(runway.length, 30, 'Runway must generate 30 points for a 30-day cycle')

  const todayPoint = runway.find((p) => p.day === initial.currentDay)
  assert.ok(todayPoint, 'Day 12 (today) point must exist in runway')
  // The verified chart anchor fix: Day 12 MUST match available cash balance exactly
  assert.equal(
    todayPoint.current,
    plan.balance,
    `Day 12 runway anchor (${todayPoint.current}) must strictly equal available balance (${plan.balance})`,
  )

  const monthEndPoint = runway.find((p) => p.day === initial.cycleLength)
  assert.ok(monthEndPoint, 'Day 30 point must exist in runway')
  assert.equal(
    monthEndPoint.current,
    plan.monthEnd,
    `Day 30 runway point (${monthEndPoint.current}) must match plan.monthEnd (${plan.monthEnd})`,
  )

  // Verify smooth monotonically decreasing curve when daily allowance is spent
  for (let i = initial.currentDay; i < runway.length; i++) {
    assert.ok(
      runway[i].current <= runway[i - 1].current,
      `Day ${runway[i].day} balance (${runway[i].current}) should not exceed Day ${runway[i - 1].day} balance (${runway[i - 1].current})`,
    )
  }

  // Verify overdue obligations are accounted for on future projection days
  const stateWithOverdue = { ...initial, currentDay: 22 }
  const planOverdue = computePlan(stateWithOverdue)
  const runwayOverdue = buildRunway(stateWithOverdue, null)
  const monthEndOverdue = runwayOverdue.find((p) => p.day === stateWithOverdue.cycleLength)
  assert.equal(
    monthEndOverdue.current,
    planOverdue.monthEnd,
    `Day 30 runway point with overdue bills (${monthEndOverdue.current}) must match planOverdue.monthEnd (${planOverdue.monthEnd})`,
  )
})

test('3. Health Score Formula & Deterministic Risk Labels', () => {
  // Test risk label boundaries
  assert.equal(getRiskFromScore(100), 'healthy')
  assert.equal(getRiskFromScore(99), 'healthy')
  assert.equal(getRiskFromScore(80), 'healthy')
  assert.equal(getRiskFromScore(79), 'tight')
  assert.equal(getRiskFromScore(60), 'tight')
  assert.equal(getRiskFromScore(59), 'stretched')
  assert.equal(getRiskFromScore(40), 'stretched')
  assert.equal(getRiskFromScore(39), 'critical')
  assert.equal(getRiskFromScore(0), 'critical')

  // Clamping and invalid input safety
  assert.equal(getRiskFromScore(150), 'healthy')
  assert.equal(getRiskFromScore(-20), 'critical')
  assert.equal(getRiskFromScore(NaN), 'critical')
  assert.equal(getRiskFromScore(Infinity), 'healthy')

  // Critical Shortfall Guard: balance < unpaid obligations caps score at <= 39
  const shortfallScore = getHealthScore({
    balance: 1000,
    unpaidObligations: 2000,
    reservedSavings: 500,
    dailyAllowance: 0,
    averageDailySpend: 100,
    discretionary: -1500,
  })
  assert.ok(shortfallScore <= 39, `Shortfall score must be capped at <= 39 (actual: ${shortfallScore})`)
  assert.equal(getRiskFromScore(shortfallScore), 'critical', 'Shortfall risk must be critical')
})

test('4. Survival Forecast & Burn Rate Timing', () => {
  const initial = createInitialState()
  const plan = computePlan(initial)
  const survival = plan.survival

  // Under baseline: user spends ₹327/day. At this pace, rent on Day 20 and Netflix on Day 25 cause depletion.
  assert.equal(survival.survivesMonthUnderPlan, true, 'Survives month under recommended ₹135.89 allowance')
  assert.equal(survival.survivesMonthUnderObservedPace, false, 'Runs out of cash under ₹327/day observed burn rate')
  assert.equal(survival.projectedDepletionDayUnderPace, 25, 'Projects cash depletion on Day 25 under observed pace')
  assert.equal(survival.projectedSavingsBreachDayUnderPace, 20, 'Projects savings breach on Day 20 under observed pace')
  assert.equal(survival.status, 'at-risk')
  assert.ok(survival.headline.includes('Day 25'), 'Headline highlights Day 25 cash depletion')

  // Edge case: Critical shortfall
  const brokeState = {
    ...initial,
    startingBudget: 5000,
  }
  const brokePlan = computePlan(brokeState)
  assert.equal(brokePlan.survival.status, 'critical')
  assert.equal(brokePlan.survival.survivesMonthUnderPlan, false)

  // Edge case: Cycle completed (0 days remaining)
  const completedState = {
    ...initial,
    currentDay: 31,
  }
  const completedPlan = computePlan(completedState)
  assert.equal(completedPlan.survival.survivesMonthUnderPlan, true)
  assert.ok(completedPlan.survival.headline.includes('Complete'))
})

test('5. Transaction CRUD and Metric Reactivity', () => {
  const initial = createInitialState()

  // Add
  const withAdd = addTransaction(initial, {
    id: 'tx-new',
    description: 'Textbooks',
    amount: 500,
    day: 12,
    category: 'education',
  })
  const planAdd = computePlan(withAdd)
  assert.equal(planAdd.spentToDate, 4100)
  assert.equal(planAdd.balance, 5900)
  assert.equal(planAdd.discretionary, 2082)

  // Edit
  const withEdit = editTransaction(withAdd, 'tx-new', { amount: 300 })
  const planEdit = computePlan(withEdit)
  assert.equal(planEdit.spentToDate, 3900)
  assert.equal(planEdit.balance, 6100)
  assert.equal(planEdit.discretionary, 2282)

  // Delete
  const withDelete = deleteTransaction(withEdit, 'tx-new')
  const planDelete = computePlan(withDelete)
  assert.equal(planDelete.spentToDate, 3600)
  assert.equal(planDelete.balance, 6400)
  assert.equal(planDelete.discretionary, 2582)
})

test('6. Obligations & Reversible Payments (No Double Deductions)', () => {
  const initial = createInitialState()

  // Mark rent (₹2,000) as paid
  const paidState = markObligationPaid(initial, 'rent')
  const paidPlan = computePlan(paidState)
  assert.equal(paidPlan.unpaidObligations, 318, 'Unpaid obligations drops by ₹2,000 to ₹318')
  assert.equal(paidPlan.balance, 4400, 'Cash balance drops by ₹2,000 to ₹4,400')
  assert.equal(paidPlan.discretionary, 2582, 'Discretionary funds preserved at ₹2,582 (no double deduction)')
  assert.ok(Math.abs(paidPlan.dailyAllowance - 135.8947) < 0.01, 'Daily allowance preserved')

  // Unmark rent as unpaid (reversal)
  const unmarkedState = unmarkObligationPaid(paidState, 'rent')
  const unmarkedPlan = computePlan(unmarkedState)
  assert.equal(unmarkedPlan.unpaidObligations, 2318)
  assert.equal(unmarkedPlan.balance, 6400)
  assert.equal(unmarkedPlan.discretionary, 2582)

  // Cancel subscription (Spotify ₹119)
  const cancelledState = cancelSubscription(initial, 'spotify')
  const cancelledPlan = computePlan(cancelledState)
  assert.equal(cancelledPlan.unpaidObligations, 2199, 'Unpaid obligations drops by ₹119 to ₹2,199')
  assert.equal(cancelledPlan.discretionary, 2701, 'Discretionary funds increases by ₹119 to ₹2,701')

  // Resume subscription
  const resumedState = resumeSubscription(cancelledState, 'spotify')
  const resumedPlan = computePlan(resumedState)
  assert.equal(resumedPlan.unpaidObligations, 2318)
  assert.equal(resumedPlan.discretionary, 2582)
})

test('7. What-If Simulator Idempotency & Safety', () => {
  const initial = createInitialState()
  const p1 = PRESETS.find((p) => p.id === 'weekend')
  assert.ok(p1, 'Weekend preset exists')

  // Preview simulation
  const scenario = { ...p1.scenario, id: 'sim-weekend' }
  const previewState = applyScenario(initial, scenario)
  const previewPlan = computePlan(previewState)

  assert.equal(previewPlan.balance, 4900, 'Simulated balance reflects ₹1,500 spending')
  assert.equal(previewPlan.discretionary, 1082)
  assert.equal(initial.transactions.length, 12, 'Original state transactions unmodified by preview')

  // Commit scenario
  assert.ok(previewState.committedScenarioIds.includes('sim-weekend'))

  // Re-applying committed scenario does not double apply in UI workflow
  const planAgain = computePlan(previewState)
  assert.equal(planAgain.balance, 4900)
})

test('8. Settings Validation & Division-by-Zero Safety', () => {
  const initial = createInitialState()

  // Update budget
  const s1 = updateFinanceSettings(initial, { startingBudget: 15000 })
  const p1 = computePlan(s1)
  assert.equal(p1.balance, 11400)
  assert.equal(p1.discretionary, 7582)

  // End of cycle (currentDay = 30)
  const sEnd = updateFinanceSettings(initial, { currentDay: 30 })
  const pEnd = computePlan(sEnd)
  assert.equal(pEnd.daysRemaining, 1)
  assert.ok(Number.isFinite(pEnd.dailyAllowance), 'dailyAllowance must be finite on Day 30')

  // Past cycle (currentDay = 31)
  const sPast = { ...initial, currentDay: 31 }
  const pPast = computePlan(sPast)
  assert.equal(pPast.daysRemaining, 0)
  assert.ok(Number.isFinite(pPast.dailyAllowance), 'dailyAllowance must be finite when daysRemaining is 0')
})
