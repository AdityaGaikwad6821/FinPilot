export type CategoryId =
  | 'groceries'
  | 'transport'
  | 'food'
  | 'entertainment'
  | 'fitness'
  | 'repairs'
  | 'shopping'
  | 'education'
  | 'bills'
  | 'housing'
  | 'utilities'
  | 'music'
  | 'streaming'
  | 'cloud'
  | 'subscriptions'
  | 'other'

export interface Transaction {
  id: string
  description: string
  amount: number
  day: number
  category: CategoryId
}

export type ObligationStatus = 'paid' | 'unpaid' | 'cancelled'

export interface Obligation {
  id: string
  name: string
  amount: number
  dueDay: number
  kind: 'commitment' | 'subscription'
  category: CategoryId
  status: ObligationStatus
  paidDay?: number
  /** Paid before tracking began, so not part of spending to date. */
  settledOutsideBudget?: boolean
}

export interface SavingsGoal {
  target: number
  /** Amount already moved out to savings (not part of current balance). */
  transferred: number
}

export interface FinanceState {
  startingBudget: number
  cycleLength: number
  currentDay: number
  transactions: Transaction[]
  obligations: Obligation[]
  savings: SavingsGoal
  committedScenarioIds: string[]
}

export interface Scenario {
  id: string
  name: string
  oneTime: number
  recurring: number
  category: CategoryId
  cancelIds: string[]
}

export type RiskLevel =
  | 'healthy'
  | 'tight'
  | 'stretched'
  | 'critical'
  | 'comfortable'
  | 'high'
  | 'deficit'
  | 'safe'

export interface PlanMetrics {
  spentToDate: number
  balance: number
  unpaidObligations: number
  reservedSavings: number
  discretionary: number
  daysRemaining: number
  daysElapsed: number
  dailyAllowance: number
  averageDailySpend: number
  savingsProtected: number
  savingsCoverage: number
  assumedDailySpend: number
  monthEnd: number
  monthlyRecurring: number
  risk: RiskLevel
  health: number
}
