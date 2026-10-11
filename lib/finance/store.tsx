'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import {
  addObligation,
  addTransaction,
  applyScenario,
  cancelSubscription,
  computePlan,
  deleteObligation,
  deleteTransaction,
  editObligation,
  editTransaction,
  markObligationPaid,
  parseAmount,
  resumeSubscription,
  unmarkObligationPaid,
  updateFinanceSettings,
  type SettingsPatch,
} from './calculations'
import { createInitialState, type Preset } from './data'
import type { CategoryId, FinanceState, Obligation, PlanMetrics, Scenario, Transaction } from './types'

export type ViewId = 'overview' | 'spending' | 'commitments' | 'savings' | 'simulator' | 'settings'

export const VALID_VIEWS: readonly ViewId[] = [
  'overview',
  'spending',
  'commitments',
  'savings',
  'simulator',
  'settings',
] as const

export function parseValidView(raw: string | null | undefined): ViewId | null {
  if (!raw) return null
  const normalized = raw.trim().toLowerCase()
  return (VALID_VIEWS as readonly string[]).includes(normalized) ? (normalized as ViewId) : null
}

export interface Draft {
  id: string
  name: string
  oneTimeInput: string
  recurringInput: string
  category: CategoryId
  cancelIds: string[]
  presetId: string | null
}

interface StoreState {
  finance: FinanceState
  draft: Draft
  simulationActive: boolean
  view: ViewId
}

type Action =
  | { type: 'setPersistedFinance'; finance: FinanceState }
  | { type: 'updateDraft'; patch: Partial<Omit<Draft, 'id'>> }
  | { type: 'loadPreset'; preset: Preset; id: string }
  | { type: 'simulateCancellation'; obligationId: string; id: string }
  | { type: 'activate' }
  | { type: 'discard'; id: string }
  | { type: 'commit'; scenario: Scenario; nextId: string }
  | { type: 'addTransaction'; transaction: Transaction }
  | { type: 'editTransaction'; id: string; patch: Partial<Omit<Transaction, 'id'>> }
  | { type: 'deleteTransaction'; id: string }
  | { type: 'addObligation'; obligation: Obligation }
  | { type: 'editObligation'; id: string; patch: Partial<Omit<Obligation, 'id'>> }
  | { type: 'deleteObligation'; id: string }
  | { type: 'markPaid'; id: string }
  | { type: 'unmarkPaid'; id: string }
  | { type: 'cancelSubscription'; id: string }
  | { type: 'resumeSubscription'; id: string }
  | { type: 'setSavingsTarget'; amount: number }
  | { type: 'updateSettings'; patch: SettingsPatch }
  | { type: 'setView'; view: ViewId }
  | { type: 'reset'; id: string }

const emptyDraft = (id: string): Draft => ({
  id,
  name: '',
  oneTimeInput: '',
  recurringInput: '',
  category: 'entertainment',
  cancelIds: [],
  presetId: null,
})

const newId = () => `sc-${Math.random().toString(36).slice(2, 10)}`
const STORAGE_KEY = 'finpilot_finance_state_v1'

function reducer(state: StoreState, action: Action): StoreState {
  switch (action.type) {
    case 'setPersistedFinance':
      return { ...state, finance: action.finance }
    case 'updateDraft':
      return { ...state, draft: { ...state.draft, ...action.patch, presetId: null } }
    case 'loadPreset': {
      const s = action.preset.scenario
      return {
        ...state,
        simulationActive: true,
        draft: {
          id: action.id,
          name: s.name,
          oneTimeInput: s.oneTime ? String(s.oneTime) : '',
          recurringInput: s.recurring ? String(s.recurring) : '',
          category: s.category,
          cancelIds: s.cancelIds.filter((cid) =>
            state.finance.obligations.some((o) => o.id === cid && o.status !== 'cancelled'),
          ),
          presetId: action.preset.id,
        },
      }
    }
    case 'simulateCancellation': {
      const target = state.finance.obligations.find((o) => o.id === action.obligationId)
      if (!target) return state
      return {
        ...state,
        simulationActive: true,
        view: 'simulator',
        draft: { ...emptyDraft(action.id), name: `Cancel ${target.name}`, category: 'subscriptions', cancelIds: [target.id] },
      }
    }
    case 'activate':
      return { ...state, simulationActive: true }
    case 'discard':
      return { ...state, simulationActive: false, draft: emptyDraft(action.id) }
    case 'commit':
      if (!state.simulationActive || state.finance.committedScenarioIds.includes(action.scenario.id)) return state
      return {
        ...state,
        finance: applyScenario(state.finance, action.scenario),
        simulationActive: false,
        draft: emptyDraft(action.nextId),
      }
    case 'addTransaction':
      return { ...state, finance: addTransaction(state.finance, action.transaction) }
    case 'editTransaction':
      return { ...state, finance: editTransaction(state.finance, action.id, action.patch) }
    case 'deleteTransaction':
      return { ...state, finance: deleteTransaction(state.finance, action.id) }
    case 'addObligation':
      return { ...state, finance: addObligation(state.finance, action.obligation) }
    case 'editObligation':
      return { ...state, finance: editObligation(state.finance, action.id, action.patch) }
    case 'deleteObligation':
      return { ...state, finance: deleteObligation(state.finance, action.id) }
    case 'markPaid':
      return { ...state, finance: markObligationPaid(state.finance, action.id) }
    case 'unmarkPaid':
      return { ...state, finance: unmarkObligationPaid(state.finance, action.id) }
    case 'cancelSubscription':
      return { ...state, finance: cancelSubscription(state.finance, action.id) }
    case 'resumeSubscription':
      return { ...state, finance: resumeSubscription(state.finance, action.id) }
    case 'setSavingsTarget':
      return {
        ...state,
        finance: { ...state.finance, savings: { ...state.finance.savings, target: action.amount } },
      }
    case 'updateSettings':
      return { ...state, finance: updateFinanceSettings(state.finance, action.patch) }
    case 'setView':
      return { ...state, view: action.view }
    case 'reset':
      return { finance: createInitialState(), draft: emptyDraft(action.id), simulationActive: false, view: state.view }
  }
}

export interface DraftValidation {
  oneTimeError: string | null
  recurringError: string | null
  scenario: Scenario | null
  isEmpty: boolean
}

function validateDraft(draft: Draft): DraftValidation {
  const oneTime = parseAmount(draft.oneTimeInput)
  const recurring = parseAmount(draft.recurringInput)
  const isEmpty = oneTime.value === 0 && recurring.value === 0 && draft.cancelIds.length === 0
  const hasError = Boolean(oneTime.error || recurring.error)
  return {
    oneTimeError: oneTime.error,
    recurringError: recurring.error,
    isEmpty,
    scenario:
      hasError || isEmpty
        ? null
        : {
            id: draft.id,
            name: draft.name.trim() || 'Untitled decision',
            oneTime: oneTime.value,
            recurring: recurring.value,
            category: draft.category,
            cancelIds: draft.cancelIds,
          },
  }
}

interface FinanceContextValue {
  finance: FinanceState
  plan: PlanMetrics
  draft: Draft
  validation: DraftValidation
  simulationActive: boolean
  simulatedState: FinanceState | null
  simulatedPlan: PlanMetrics | null
  view: ViewId
  setView: (view: ViewId) => void
  updateDraft: (patch: Partial<Omit<Draft, 'id'>>) => void
  loadPreset: (preset: Preset) => void
  simulateCancellation: (obligationId: string) => void
  activate: () => void
  discard: () => void
  commit: () => Scenario | null
  addTransaction: (transaction: Transaction) => void
  editTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void
  deleteTransaction: (id: string) => void
  addObligation: (obligation: Obligation) => void
  editObligation: (id: string, patch: Partial<Omit<Obligation, 'id'>>) => void
  deleteObligation: (id: string) => void
  markPaid: (id: string) => void
  unmarkPaid: (id: string) => void
  cancelSubscription: (id: string) => void
  resumeSubscription: (id: string) => void
  setSavingsTarget: (amount: number) => void
  updateSettings: (patch: SettingsPatch) => void
  reset: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    finance: createInitialState(),
    draft: emptyDraft('sc-initial'),
    simulationActive: false,
    view: 'overview' as ViewId,
  }))

  const hasHydrated = useRef(false)

  // Hydrate persisted state and view on client mount safely
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as FinanceState
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          typeof parsed.startingBudget === 'number' &&
          Array.isArray(parsed.transactions) &&
          Array.isArray(parsed.obligations) &&
          typeof parsed.savings?.target === 'number'
        ) {
          dispatch({ type: 'setPersistedFinance', finance: parsed })
        }
      }
    } catch {
      // Local storage disabled or corrupted, ignore safely
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const urlView = parseValidView(params.get('view') || params.get('tab'))
      if (urlView) {
        dispatch({ type: 'setView', view: urlView })
      }
    } catch {
      // Ignore
    }

    const onPopState = () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const popped = parseValidView(params.get('view') || params.get('tab')) ?? 'overview'
        dispatch({ type: 'setView', view: popped })
      } catch {
        // Ignore
      }
    }

    window.addEventListener('popstate', onPopState)
    hasHydrated.current = true
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Sync active view to URL and localStorage
  useEffect(() => {
    if (!hasHydrated.current) return
    try {
      localStorage.setItem('finpilot_last_view', state.view)
      const currentUrl = new URL(window.location.href)
      const currentParam = currentUrl.searchParams.get('view')
      if (state.view === 'overview') {
        if (currentParam) {
          currentUrl.searchParams.delete('view')
          currentUrl.searchParams.delete('tab')
          window.history.pushState({ view: 'overview' }, '', currentUrl.toString())
        }
      } else if (currentParam !== state.view) {
        currentUrl.searchParams.set('view', state.view)
        currentUrl.searchParams.delete('tab')
        window.history.pushState({ view: state.view }, '', currentUrl.toString())
      }
    } catch {
      // Ignore
    }
  }, [state.view])

  // Sync confirmed changes to localStorage
  useEffect(() => {
    if (!hasHydrated.current) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.finance))
    } catch {
      // Ignore quota errors
    }
  }, [state.finance])

  const plan = useMemo(() => computePlan(state.finance), [state.finance])
  const validation = useMemo(() => validateDraft(state.draft), [state.draft])

  const simulatedState = useMemo(
    () => (state.simulationActive && validation.scenario ? applyScenario(state.finance, validation.scenario) : null),
    [state.simulationActive, validation.scenario, state.finance],
  )
  const simulatedPlan = useMemo(
    () => (simulatedState ? computePlan(simulatedState, plan.assumedDailySpend) : null),
    [simulatedState, plan.assumedDailySpend],
  )

  const commit = useCallback(() => {
    const scenario = validation.scenario
    if (!state.simulationActive || !scenario || state.finance.committedScenarioIds.includes(scenario.id)) return null
    dispatch({ type: 'commit', scenario, nextId: newId() })
    return scenario
  }, [validation.scenario, state.simulationActive, state.finance.committedScenarioIds])

  const handleReset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
    dispatch({ type: 'reset', id: newId() })
  }, [])

  const value: FinanceContextValue = {
    finance: state.finance,
    plan,
    draft: state.draft,
    validation,
    simulationActive: state.simulationActive,
    simulatedState,
    simulatedPlan,
    view: state.view,
    setView: (view) => dispatch({ type: 'setView', view }),
    updateDraft: (patch) => dispatch({ type: 'updateDraft', patch }),
    loadPreset: (preset) => dispatch({ type: 'loadPreset', preset, id: newId() }),
    simulateCancellation: (obligationId) => dispatch({ type: 'simulateCancellation', obligationId, id: newId() }),
    activate: () => dispatch({ type: 'activate' }),
    discard: () => dispatch({ type: 'discard', id: newId() }),
    commit,
    addTransaction: (transaction) => dispatch({ type: 'addTransaction', transaction }),
    editTransaction: (id, patch) => dispatch({ type: 'editTransaction', id, patch }),
    deleteTransaction: (id) => dispatch({ type: 'deleteTransaction', id }),
    addObligation: (obligation) => dispatch({ type: 'addObligation', obligation }),
    editObligation: (id, patch) => dispatch({ type: 'editObligation', id, patch }),
    deleteObligation: (id) => dispatch({ type: 'deleteObligation', id }),
    markPaid: (id) => dispatch({ type: 'markPaid', id }),
    unmarkPaid: (id) => dispatch({ type: 'unmarkPaid', id }),
    cancelSubscription: (id) => dispatch({ type: 'cancelSubscription', id }),
    resumeSubscription: (id) => dispatch({ type: 'resumeSubscription', id }),
    setSavingsTarget: (amount) => dispatch({ type: 'setSavingsTarget', amount }),
    updateSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
    reset: handleReset,
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider')
  return ctx
}
