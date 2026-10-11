'use client'

import { useState } from 'react'
import { Check, FlaskConical, Pencil, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFinance } from '@/lib/finance/store'
import { ALL_CATEGORIES, CATEGORIES } from '@/lib/finance/categories'
import { formatINR } from '@/lib/finance/format'
import { parseAmount } from '@/lib/finance/calculations'
import type { CategoryId, Obligation } from '@/lib/finance/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CategoryIcon, Panel, PanelHeader } from './primitives'

function StatusPill({ o, currentDay }: { o: Obligation; currentDay: number }) {
  if (o.status === 'paid')
    return <span className="rounded-full bg-positive/12 px-2 py-0.5 text-[11px] font-medium text-positive">Paid</span>
  if (o.status === 'cancelled')
    return <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Cancelled</span>
  const overdue = o.dueDay < currentDay
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium',
        overdue ? 'bg-danger/12 text-danger' : 'bg-caution/12 text-caution',
      )}
    >
      {overdue ? 'Overdue' : o.dueDay === currentDay ? 'Due today' : `Due in ${o.dueDay - currentDay}d`}
    </span>
  )
}

interface ObligationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialObligation?: Obligation | null
  defaultKind?: 'commitment' | 'subscription'
}

function ObligationDialog({ open, onOpenChange, initialObligation, defaultKind = 'commitment' }: ObligationDialogProps) {
  const { finance, addObligation, editObligation } = useFinance()
  const isEditing = Boolean(initialObligation)
  const kind = initialObligation?.kind ?? defaultKind

  const [name, setName] = useState(initialObligation?.name ?? '')
  const [amount, setAmount] = useState(initialObligation ? String(initialObligation.amount) : '')
  const [category, setCategory] = useState<CategoryId>(
    initialObligation?.category ?? (kind === 'subscription' ? 'subscriptions' : 'bills'),
  )
  const [dueDay, setDueDay] = useState(initialObligation ? String(initialObligation.dueDay) : String(finance.currentDay))
  const [errors, setErrors] = useState<{ name?: string; amount?: string; dueDay?: string }>({})

  const resetForm = () => {
    setName(initialObligation?.name ?? '')
    setAmount(initialObligation ? String(initialObligation.amount) : '')
    setCategory(initialObligation?.category ?? (kind === 'subscription' ? 'subscriptions' : 'bills'))
    setDueDay(initialObligation ? String(initialObligation.dueDay) : String(finance.currentDay))
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { name?: string; amount?: string; dueDay?: string } = {}

    if (!name.trim()) newErrors.name = 'Please enter a name.'

    const parsedAmount = parseAmount(amount)
    if (parsedAmount.error || parsedAmount.value <= 0) {
      newErrors.amount = parsedAmount.error || 'Enter an amount greater than ₹0.'
    }

    const parsedDueDay = Number(dueDay)
    if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > finance.cycleLength) {
      newErrors.dueDay = `Enter a due day between 1 and ${finance.cycleLength}.`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (isEditing && initialObligation) {
      editObligation(initialObligation.id, {
        name: name.trim(),
        amount: parsedAmount.value,
        category,
        dueDay: parsedDueDay,
      })
      toast.success('Obligation updated', {
        description: `${name.trim()} updated to ${formatINR(parsedAmount.value)} due Day ${parsedDueDay}.`,
      })
    } else {
      const newObligation: Obligation = {
        id: `ob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        amount: parsedAmount.value,
        category,
        dueDay: parsedDueDay,
        kind,
        status: 'unpaid',
      }
      addObligation(newObligation)
      toast.success(`${kind === 'subscription' ? 'Subscription' : 'Bill'} added`, {
        description: `${name.trim()} · ${formatINR(parsedAmount.value)} due on Day ${parsedDueDay}.`,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (val) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit ${kind === 'subscription' ? 'subscription' : 'bill'}`
              : `Add new ${kind === 'subscription' ? 'subscription' : 'bill'}`}
          </DialogTitle>
          <DialogDescription>
            {kind === 'subscription'
              ? 'Monthly recurring payment tracked in your cycle and future obligations.'
              : 'A scheduled bill payment due in your cycle.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ob-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="ob-name"
              placeholder={kind === 'subscription' ? 'e.g. YouTube Premium, Gym membership' : 'e.g. Electricity bill, Tuition fee'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 bg-surface"
              autoFocus
            />
            {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ob-amount" className="text-xs text-muted-foreground">
                Amount (₹)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  id="ob-amount"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 bg-surface pl-7 font-mono tabular-nums"
                />
              </div>
              {errors.amount && <p className="text-xs text-danger">{errors.amount}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ob-due" className="text-xs text-muted-foreground">
                Due day (1–{finance.cycleLength})
              </Label>
              <Input
                id="ob-due"
                type="number"
                min={1}
                max={finance.cycleLength}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="h-10 bg-surface font-mono tabular-nums"
              />
              {errors.dueDay && <p className="text-xs text-danger">{errors.dueDay}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 max-h-40 overflow-y-auto p-1 rounded-lg border border-border bg-surface">
              {ALL_CATEGORIES.map((catId) => {
                const meta = CATEGORIES[catId]
                const Icon = meta.icon
                const isSelected = category === catId
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategory(catId)}
                    className={`flex items-center gap-2 rounded-md p-2 text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/15 text-primary border border-primary/40 font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" style={{ color: meta.color }} />
                    <span className="truncate">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit">
              {isEditing ? 'Save changes' : 'Add obligation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ObligationRow({
  o,
  onEdit,
}: {
  o: Obligation
  onEdit: (o: Obligation) => void
}) {
  const { finance, markPaid, unmarkPaid, cancelSubscription, resumeSubscription, simulateCancellation, deleteObligation } = useFinance()

  const handleMarkPaid = () => {
    markPaid(o.id)
    toast.success(`${o.name} marked paid`, {
      description: `${formatINR(o.amount)} deducted and recorded as spent today.`,
    })
  }

  const handleUnmarkPaid = () => {
    unmarkPaid(o.id)
    toast.info(`${o.name} payment reversed`, {
      description: `${formatINR(o.amount)} restored to balance and returned to unpaid obligations.`,
    })
  }

  const handleCancelSub = () => {
    cancelSubscription(o.id)
    if (o.status === 'unpaid') {
      toast.success(`${o.name} subscription cancelled`, {
        description: `Saved ${formatINR(o.amount)} this cycle and stopped future charges.`,
      })
    } else {
      toast.info(`${o.name} subscription cancelled`, {
        description: `Current cycle payment remains recorded; renewal stopped for future cycles.`,
      })
    }
  }

  const handleResumeSub = () => {
    resumeSubscription(o.id)
    toast.success(`${o.name} subscription reactivated`, {
      description: `Future recurring obligation restored.`,
    })
  }

  const handleDelete = () => {
    deleteObligation(o.id)
    toast.success(`${o.name} removed`, {
      description: `Obligation deleted from your plan.`,
    })
  }

  return (
    <li className={cn('group flex flex-wrap items-center gap-3 py-3', o.status === 'cancelled' && 'opacity-60')}>
      <CategoryIcon category={o.category} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', o.status === 'cancelled' && 'line-through')}>{o.name}</p>
        <p className="text-xs text-muted-foreground">
          Day {o.dueDay}
          {o.kind === 'subscription' && ' · monthly'}
          {o.status === 'paid' && o.paidDay !== undefined && ` · paid Day ${o.paidDay}`}
          {o.status === 'cancelled' && ' · cancelled'}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="font-mono text-sm font-medium tabular-nums">{formatINR(o.amount)}</span>
        <StatusPill o={o} currentDay={finance.currentDay} />
      </div>

      <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto">
        {o.kind === 'subscription' && o.status !== 'cancelled' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => simulateCancellation(o.id)}
            aria-label={`Simulate cancelling ${o.name}`}
            className="text-xs"
          >
            <FlaskConical className="size-3.5" />
            <span className="hidden sm:inline">Simulate</span> cancel
          </Button>
        )}

        {o.status === 'unpaid' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkPaid}
            aria-label={`Mark ${o.name} as paid`}
            className="text-xs"
          >
            <Check className="size-3.5" />
            Mark paid
          </Button>
        )}

        {o.status === 'paid' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnmarkPaid}
            aria-label={`Correct payment status for ${o.name}`}
            title="Undo payment deduction"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Unmark
          </Button>
        )}

        {o.kind === 'subscription' && o.status !== 'cancelled' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelSub}
            aria-label={`Cancel ${o.name} subscription`}
            className="text-xs text-muted-foreground hover:text-danger"
          >
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        )}

        {o.kind === 'subscription' && o.status === 'cancelled' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResumeSub}
            aria-label={`Resume ${o.name} subscription`}
            className="text-xs text-positive"
          >
            <RotateCcw className="size-3.5" />
            Resume
          </Button>
        )}

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(o)}
            aria-label={`Edit ${o.name}`}
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleDelete}
            aria-label={`Delete ${o.name}`}
            className="size-7 text-muted-foreground hover:text-danger"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </li>
  )
}

export function Commitments({ compact = false }: { compact?: boolean }) {
  const { finance, plan, setView } = useFinance()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null)
  const [defaultKind, setDefaultKind] = useState<'commitment' | 'subscription'>('commitment')

  const sorted = [...finance.obligations].sort((a, b) => {
    const rank = (o: Obligation) => (o.status === 'unpaid' ? 0 : o.status === 'paid' ? 1 : 2)
    return rank(a) - rank(b) || a.dueDay - b.dueDay
  })
  const list = compact ? sorted.filter((o) => o.status === 'unpaid') : sorted
  const commitments = list.filter((o) => o.kind === 'commitment')
  const subscriptions = list.filter((o) => o.kind === 'subscription')

  const handleOpenAddBill = () => {
    setEditingObligation(null)
    setDefaultKind('commitment')
    setDialogOpen(true)
  }

  const handleOpenAddSub = () => {
    setEditingObligation(null)
    setDefaultKind('subscription')
    setDialogOpen(true)
  }

  const handleEdit = (o: Obligation) => {
    setEditingObligation(o)
    setDefaultKind(o.kind)
    setDialogOpen(true)
  }

  return (
    <>
      <Panel aria-labelledby="commitments-title">
        <PanelHeader
          id="commitments-title"
          title={compact ? 'Upcoming obligations' : 'Commitments & subscriptions'}
          description={`${formatINR(plan.unpaidObligations)} still due this cycle · ${formatINR(plan.monthlyRecurring)}/mo recurring`}
          action={
            compact ? (
              <Button size="sm" variant="ghost" onClick={() => setView('commitments')} className="h-8 text-xs">
                Manage all
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleOpenAddBill} className="h-8 gap-1.5 text-xs">
                  <Plus className="size-3.5" />
                  Add bill
                </Button>
                <Button size="sm" onClick={handleOpenAddSub} className="h-8 gap-1.5 text-xs">
                  <Plus className="size-3.5" />
                  Add subscription
                </Button>
              </div>
            )
          }
        />

        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Every listed obligation is settled for this cycle.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {[
              { label: 'Bills & Commitments', items: commitments, onAdd: handleOpenAddBill },
              { label: 'Subscriptions', items: subscriptions, onAdd: handleOpenAddSub },
            ]
              .filter((g) => g.items.length > 0 || !compact)
              .map((g) => (
                <div key={g.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      {g.label} ({g.items.length})
                    </h3>
                  </div>
                  {g.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      No {g.label.toLowerCase()} listed.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {g.items.map((o) => (
                        <ObligationRow key={o.id} o={o} onEdit={handleEdit} />
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        )}
      </Panel>

      <ObligationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialObligation={editingObligation}
        defaultKind={defaultKind}
      />
    </>
  )
}
