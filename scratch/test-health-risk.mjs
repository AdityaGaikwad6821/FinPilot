// Unit tests for Financial Health Score & Risk Level Unification

import {
  getRiskFromScore,
  getHealthScore,
  computePlan,
  RISK_RANK,
} from '../lib/finance/calculations.ts'

import { RISK_LABEL, RISK_FULL_LABEL } from '../lib/finance/format.ts'
import { createInitialState } from '../lib/finance/data.ts'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✅ PASS: ${message}`)
}

console.log('--- TEST 1: TEST EXACT REQUIRED SCORES & BOUNDARIES ---')
// Required scores: 99, 80, 79, 60, 59, 40, 39, 0
assert(getRiskFromScore(99) === 'healthy', 'Score 99 -> healthy (Healthy / Low risk)')
assert(getRiskFromScore(80) === 'healthy', 'Score 80 -> healthy (lower boundary of healthy)')
assert(getRiskFromScore(79) === 'tight', 'Score 79 -> tight (upper boundary of tight)')
assert(getRiskFromScore(60) === 'tight', 'Score 60 -> tight (lower boundary of tight)')
assert(getRiskFromScore(59) === 'stretched', 'Score 59 -> stretched (upper boundary of stretched)')
assert(getRiskFromScore(40) === 'stretched', 'Score 40 -> stretched (lower boundary of stretched)')
assert(getRiskFromScore(39) === 'critical', 'Score 39 -> critical (upper boundary of critical)')
assert(getRiskFromScore(0) === 'critical', 'Score 0 -> critical (lower boundary of critical)')

console.log('\n--- TEST 2: TEST CLAMPING AND INVALID INPUT SAFETY ---')
assert(getRiskFromScore(100) === 'healthy', 'Score 100 -> healthy')
assert(getRiskFromScore(150) === 'healthy', 'Score 150 clamped to 100 -> healthy')
assert(getRiskFromScore(-20) === 'critical', 'Score -20 clamped to 0 -> critical')
assert(getRiskFromScore(NaN) === 'critical', 'Score NaN safely handles -> critical')
assert(getRiskFromScore(Infinity) === 'healthy', 'Score Infinity safely handles -> healthy')
assert(getRiskFromScore(-Infinity) === 'critical', 'Score -Infinity safely handles -> critical')
assert(getRiskFromScore(undefined) === 'critical', 'Score undefined safely handles -> critical')
assert(getRiskFromScore(null) === 'critical', 'Score null safely handles -> critical')

console.log('\n--- TEST 3: TEST LABELS & CONSISTENCY ---')
assert(RISK_LABEL.healthy === 'Healthy', 'RISK_LABEL.healthy is "Healthy"')
assert(RISK_LABEL.tight === 'Tight', 'RISK_LABEL.tight is "Tight"')
assert(RISK_LABEL.stretched === 'Stretched', 'RISK_LABEL.stretched is "Stretched"')
assert(RISK_LABEL.critical === 'Critical', 'RISK_LABEL.critical is "Critical"')

assert(RISK_FULL_LABEL.healthy === 'Healthy / Low risk', 'Full label for healthy')
assert(RISK_FULL_LABEL.tight === 'Tight / Moderate risk', 'Full label for tight')
assert(RISK_FULL_LABEL.stretched === 'Stretched / High risk', 'Full label for stretched')
assert(RISK_FULL_LABEL.critical === 'Critical / Very high risk', 'Full label for critical')

assert(RISK_RANK.healthy > RISK_RANK.tight, 'Rank: healthy > tight')
assert(RISK_RANK.tight > RISK_RANK.stretched, 'Rank: tight > stretched')
assert(RISK_RANK.stretched > RISK_RANK.critical, 'Rank: stretched > critical')

console.log('\n--- TEST 4: TEST 4 COMPONENTS OF HEALTH SCORE ---')
// Component 1: Obligation Coverage (30 pts)
// Component 2: Savings Goal Protection (25 pts)
// Component 3: Daily Discretionary Allowance (25 pts)
// Component 4: Spending Pace (20 pts)
const perfectState = {
  balance: 10000,
  unpaidObligations: 2000,
  reservedSavings: 1000,
  dailyAllowance: 250, // >= 200
  averageDailySpend: 200, // <= dailyAllowance
  discretionary: 7000,
}
const perfectScore = getHealthScore(perfectState)
assert(perfectScore === 100, `Perfect state yields 100/100 (actual: ${perfectScore})`)
assert(getRiskFromScore(perfectScore) === 'healthy', 'Perfect state is Healthy')

// Baseline state
const baselineState = createInitialState()
const baselinePlan = computePlan(baselineState)
console.log(`Baseline Health Score: ${baselinePlan.health}/100, Risk Level: ${baselinePlan.risk} (${RISK_LABEL[baselinePlan.risk]})`)
assert(baselinePlan.health >= 80 && baselinePlan.health <= 100, `Baseline score is in Healthy band (actual: ${baselinePlan.health})`)
assert(baselinePlan.risk === 'healthy', `Baseline risk badge is strictly 'healthy' (no more 'tight' inconsistency!)`)

console.log('\n--- TEST 5: TEST INDEPENDENT CRITICAL SHORTFALL GUARD ---')
// Scenario where cash cannot cover obligations: balance 1000, unpaid obligations 2500
const shortfallState = {
  balance: 1000,
  unpaidObligations: 2500,
  reservedSavings: 500,
  dailyAllowance: -50,
  averageDailySpend: 100,
  discretionary: -2000,
}
const shortfallScore = getHealthScore(shortfallState)
assert(shortfallScore <= 39, `Shortfall score cannot exceed 39 (actual: ${shortfallScore})`)
assert(getRiskFromScore(shortfallScore) === 'critical', 'Shortfall risk is strictly Critical')

// Edge case: even if somehow allowance was made high, balance < unpaid MUST cap at 39
const deceptiveInput = {
  balance: 500,
  unpaidObligations: 2000,
  reservedSavings: 0,
  dailyAllowance: 300,
  averageDailySpend: 50,
  discretionary: -1500,
}
const deceptiveScore = getHealthScore(deceptiveInput)
assert(deceptiveScore <= 39, `Deceptive input with unpaid bills shortfall strictly capped at <= 39 (actual: ${deceptiveScore})`)
assert(getRiskFromScore(deceptiveScore) === 'critical', 'Deceptive input classified as Critical')

console.log('\n🎉 ALL HEALTH SCORE & RISK UNIFICATION TESTS PASSED!')
