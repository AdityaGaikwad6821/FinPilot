import type { FinanceState, Scenario } from './types'

export function createInitialState(): FinanceState {
  return {
    startingBudget: 10000,
    cycleLength: 30,
    currentDay: 12,
    transactions: [
      { id: 't1', description: 'BigBasket weekly order', amount: 450, day: 1, category: 'groceries' },
      { id: 't2', description: 'Metro card recharge', amount: 300, day: 2, category: 'transport' },
      { id: 't3', description: 'Swiggy · Biryani night', amount: 340, day: 3, category: 'food' },
      { id: 't4', description: 'Third Wave Coffee', amount: 220, day: 4, category: 'food' },
      { id: 't5', description: 'DMart essentials', amount: 380, day: 5, category: 'groceries' },
      { id: 't6', description: 'Uber to college', amount: 180, day: 6, category: 'transport' },
      { id: 't7', description: 'Zomato · Friends dinner', amount: 450, day: 7, category: 'food' },
      { id: 't8', description: 'Rapido bike ride', amount: 120, day: 8, category: 'transport' },
      { id: 't9', description: 'Zepto top-up', amount: 370, day: 9, category: 'groceries' },
      { id: 't10', description: 'Mess dinner pass', amount: 290, day: 10, category: 'food' },
      { id: 't11', description: 'Ola airport drop', amount: 200, day: 11, category: 'transport' },
      { id: 't12', description: 'Swiggy · Late-night order', amount: 300, day: 11, category: 'food' },
    ],
    obligations: [
      { id: 'rent', name: 'Rent', amount: 2000, dueDay: 20, kind: 'commitment', category: 'housing', status: 'unpaid' },
      {
        id: 'mobile',
        name: 'Mobile bill',
        amount: 499,
        dueDay: 2,
        kind: 'commitment',
        category: 'utilities',
        status: 'paid',
        paidDay: 2,
        settledOutsideBudget: true,
      },
      { id: 'spotify', name: 'Spotify', amount: 119, dueDay: 18, kind: 'subscription', category: 'music', status: 'unpaid' },
      {
        id: 'cloud',
        name: 'Cloud storage',
        amount: 130,
        dueDay: 5,
        kind: 'subscription',
        category: 'cloud',
        status: 'paid',
        paidDay: 5,
        settledOutsideBudget: true,
      },
      { id: 'netflix', name: 'Netflix', amount: 199, dueDay: 25, kind: 'subscription', category: 'streaming', status: 'unpaid' },
    ],
    savings: { target: 1500, transferred: 0 },
    committedScenarioIds: [],
  }
}

export interface Preset {
  id: string
  label: string
  hint: string
  scenario: Omit<Scenario, 'id'>
}

export const PRESETS: Preset[] = [
  {
    id: 'weekend',
    label: 'Weekend outing',
    hint: '₹1,500 one-time',
    scenario: { name: 'Weekend outing', oneTime: 1500, recurring: 0, category: 'entertainment', cancelIds: [] },
  },
  {
    id: 'gym',
    label: 'New gym subscription',
    hint: '₹800/month',
    scenario: { name: 'New gym subscription', oneTime: 0, recurring: 800, category: 'fitness', cancelIds: [] },
  },
  {
    id: 'phone',
    label: 'Unexpected phone repair',
    hint: '₹2,500 one-time',
    scenario: { name: 'Unexpected phone repair', oneTime: 2500, recurring: 0, category: 'repairs', cancelIds: [] },
  },
  {
    id: 'streaming',
    label: 'Cancel streaming subscriptions',
    hint: 'Saves ₹318/month',
    scenario: {
      name: 'Cancel streaming subscriptions',
      oneTime: 0,
      recurring: 0,
      category: 'subscriptions',
      cancelIds: ['spotify', 'netflix'],
    },
  },
]
