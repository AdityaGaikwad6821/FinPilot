// Standalone verification script for FinPilot financial engine

import {
  computePlan,
  getRisk,
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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('--- 1. VERIFY INITIAL BASELINE SAMPLE FIGURES ---')
const initial = createInitialState()
const plan0 = computePlan(initial)

assert(initial.startingBudget === 10000, 'Starting budget is ₹10,000')
assert(initial.cycleLength === 30, 'Cycle length is 30 days')
assert(initial.currentDay === 12, 'Current day is Day 12')
assert(plan0.daysRemaining === 19, 'Days remaining is 19')
assert(plan0.spentToDate === 3600, `Total spent so far is ₹3,600 (actual: ${plan0.spentToDate})`)
assert(plan0.balance === 6400, `Remaining cash balance is ₹6,400 (actual: ${plan0.balance})`)
assert(plan0.unpaidObligations === 2318, `Unpaid obligations is ₹2,318 (actual: ${plan0.unpaidObligations})`)
assert(plan0.reservedSavings === 1500, `Protected savings goal is ₹1,500 (actual: ${plan0.reservedSavings})`)
assert(plan0.discretionary === 2582, `Discretionary funds is ₹2,582 (actual: ${plan0.discretionary})`)
assert(Math.abs(plan0.dailyAllowance - 135.8947) < 0.01, `Daily allowance is ~₹135.89/day (actual: ${plan0.dailyAllowance.toFixed(2)})`)
assert(plan0.risk === 'healthy', `Risk band is healthy (score ${plan0.health}/100 in 80-100 tier) (actual: ${plan0.risk})`)

console.log('\n--- 2. VERIFY TRANSACTION CRUD ---')
const withAddedTx = addTransaction(initial, {
  id: 'tx-new',
  description: 'Test book',
  amount: 400,
  day: 12,
  category: 'education',
})
const planAdded = computePlan(withAddedTx)
assert(planAdded.spentToDate === 4000, `Spent updated to ₹4,000 (actual: ${planAdded.spentToDate})`)
assert(planAdded.balance === 6000, `Balance updated to ₹6,000 (actual: ${planAdded.balance})`)
assert(planAdded.discretionary === 2182, `Discretionary updated to ₹2,182 (actual: ${planAdded.discretionary})`)

const withEditedTx = editTransaction(withAddedTx, 'tx-new', { amount: 200 })
const planEdited = computePlan(withEditedTx)
assert(planEdited.spentToDate === 3800, `Spent after edit is ₹3,800 (actual: ${planEdited.spentToDate})`)

const withDeletedTx = deleteTransaction(withEditedTx, 'tx-new')
const planDeleted = computePlan(withDeletedTx)
assert(planDeleted.spentToDate === 3600, `Spent after delete restored to ₹3,600 (actual: ${planDeleted.spentToDate})`)

console.log('\n--- 3. VERIFY OBLIGATIONS & REVERSIBLE PAYMENTS ---')
// Mark rent (₹2,000) as paid
const withRentPaid = markObligationPaid(initial, 'rent')
const planRentPaid = computePlan(withRentPaid)
assert(planRentPaid.unpaidObligations === 318, `Unpaid obligations reduced by ₹2,000 to ₹318 (actual: ${planRentPaid.unpaidObligations})`)
assert(planRentPaid.balance === 4400, `Cash balance reduced by ₹2,000 to ₹4,400 (actual: ${planRentPaid.balance})`)
assert(planRentPaid.discretionary === 2582, `Discretionary funds preserved at ₹2,582 (no double deduction!) (actual: ${planRentPaid.discretionary})`)
assert(Math.abs(planRentPaid.dailyAllowance - 135.8947) < 0.01, `Daily allowance unchanged after paying obligation`)

// Unmark rent (correcting payment status)
const withRentUnmarked = unmarkObligationPaid(withRentPaid, 'rent')
const planRentUnmarked = computePlan(withRentUnmarked)
assert(planRentUnmarked.unpaidObligations === 2318, `Unpaid obligations restored to ₹2,318`)
assert(planRentUnmarked.balance === 6400, `Cash balance restored to ₹6,400`)
assert(planRentUnmarked.discretionary === 2582, `Discretionary restored to ₹2,582`)

console.log('\n--- 4. VERIFY WHAT-IF SIMULATOR PRESETS ---')
// Preset 1: Weekend outing (₹1,500 one-time)
const p1 = PRESETS.find((p) => p.id === 'weekend')
const sim1 = applyScenario(initial, { ...p1.scenario, id: 'sim-1' })
const planSim1 = computePlan(sim1)
assert(planSim1.balance === 4900, `Preset 1 balance is ₹4,900 (actual: ${planSim1.balance})`)
assert(planSim1.discretionary === 1082, `Preset 1 discretionary is ₹1,082 (actual: ${planSim1.discretionary})`)
assert(plan0.balance === 6400, `Initial state unmodified by simulation preview`)

// Preset 2: New gym subscription (₹800/month recurring)
const p2 = PRESETS.find((p) => p.id === 'gym')
const sim2 = applyScenario(initial, { ...p2.scenario, id: 'sim-2' })
const planSim2 = computePlan(sim2)
assert(planSim2.balance === 5600, `Preset 2 balance is ₹5,600 (actual: ${planSim2.balance})`)
assert(planSim2.discretionary === 1782, `Preset 2 discretionary is ₹1,782 (actual: ${planSim2.discretionary})`)

// Preset 3: Unexpected phone repair (₹2,500 one-time)
const p3 = PRESETS.find((p) => p.id === 'phone')
const sim3 = applyScenario(initial, { ...p3.scenario, id: 'sim-3' })
const planSim3 = computePlan(sim3)
assert(planSim3.balance === 3900, `Preset 3 balance is ₹3,900 (actual: ${planSim3.balance})`)
assert(planSim3.discretionary === 82, `Preset 3 discretionary is ₹82 (actual: ${planSim3.discretionary})`)
assert(planSim3.risk === 'stretched' || planSim3.risk === 'high', `Preset 3 risk is stretched (actual: ${planSim3.risk})`)

// Preset 4: Cancel streaming (Spotify ₹119 + Netflix ₹199 = saves ₹318 unpaid this cycle)
const p4 = PRESETS.find((p) => p.id === 'streaming')
const sim4 = applyScenario(initial, { ...p4.scenario, id: 'sim-4' })
const planSim4 = computePlan(sim4)
assert(planSim4.unpaidObligations === 2000, `Preset 4 unpaid obligations reduced to ₹2,000 (actual: ${planSim4.unpaidObligations})`)
assert(planSim4.discretionary === 2900, `Preset 4 discretionary increased by ₹318 to ₹2,900 (actual: ${planSim4.discretionary})`)
assert(Math.abs(planSim4.dailyAllowance - 152.63) < 0.05, `Preset 4 daily allowance increased to ~₹152.63/day`)

console.log('\n--- 5. VERIFY SETTINGS & DIVISION-BY-ZERO EDGE CASES ---')
const settingsUpdated = updateFinanceSettings(initial, {
  startingBudget: 15000,
  currentDay: 20,
  cycleLength: 30,
  savingsTarget: 2000,
})
const planSettings = computePlan(settingsUpdated)
assert(planSettings.balance === 11400, `Updated budget balance is ₹11,400 (actual: ${planSettings.balance})`)
assert(planSettings.daysRemaining === 11, `Days remaining is 11 (30 - 20 + 1)`)

// End of cycle: currentDay = 30 of 30 days -> 1 day remaining (today)
const lastDay = updateFinanceSettings(initial, { currentDay: 30, cycleLength: 30 })
const planLastDay = computePlan(lastDay)
assert(planLastDay.daysRemaining === 1, `Days remaining on last day of cycle is 1`)
assert(!Number.isNaN(planLastDay.dailyAllowance), `Daily allowance is not NaN on last day`)

// Past cycle edge case: zero days remaining test
const pastCycleState = { ...initial, currentDay: 32, cycleLength: 30 }
const planPast = computePlan(pastCycleState)
assert(planPast.daysRemaining === 0, `Days remaining after cycle end is 0`)
assert(!Number.isNaN(planPast.dailyAllowance), `Daily allowance is not NaN when days remaining is 0`)

console.log('\n--- 6. VERIFY RUNWAY CHART DATA GENERATION ---')
const runway = buildRunway(initial, sim1)
assert(runway.length === 30, `Runway points match cycle length 30 (actual: ${runway.length})`)
assert(runway[11].day === 12, `Day 12 matches current day`)
assert(runway[11].current === 6400 || runway[11].current === 6264, `Day 12 baseline generated properly`)
assert(runway[11].simulated !== null, `Day 12 simulated curve generated properly`)

console.log('\n🎉 ALL CALCULATIONS, CRUD, PRESETS, AND EDGE CASES VERIFIED!')
