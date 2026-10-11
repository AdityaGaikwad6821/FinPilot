'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { useFinance } from '@/lib/finance/store'
import { ALL_CATEGORIES, CATEGORIES } from '@/lib/finance/categories'
import { formatINR } from '@/lib/finance/format'
import { parseAmount } from '@/lib/finance/calculations'
import type { CategoryId, Transaction } from '@/lib/finance/types'
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

const chartConfig = { amount: { label: 'Spent', color: 'var(--chart-1)' } } satisfies ChartConfig

export function CategoryBreakdown() {
  const { finance, plan } = useFinance()
  const rows = useMemo(() => {
    const totals = new Map<CategoryId, number>()
    for (const t of finance.transactions) totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount)
    return [...totals.entries()]
      .map(([category, amount]) => ({ category, label: CATEGORIES[category].label, color: CATEGORIES[category].color, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [finance.transactions])

  return (
    <Panel aria-labelledby="breakdown-title">
      <PanelHeader
        id="breakdown-title"
        title="Spending by category"
        description={`${formatINR(plan.spentToDate)} spent over ${plan.daysElapsed} days`}
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No spending recorded yet.</p>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: Math.max(160, rows.length * 40 + 8) }}>
          <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 64, top: 0, bottom: 0 }} barCategoryGap={8}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="label" width={96} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={{ fill: 'oklch(1 0 0 / 4%)' }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
                    <p className="font-medium">{payload[0].payload.label}</p>
                    <p className="font-mono tabular-nums text-muted-foreground">{formatINR(payload[0].value as number)}</p>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="amount"
              radius={6}
              isAnimationActive={false}
              label={{ position: 'right', formatter: (v: unknown) => formatINR(Number(v)), className: 'fill-foreground text-xs font-mono' }}
            >
              {rows.map((r) => (
                <Cell key={r.category} fill={r.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </Panel>
  )
}

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTransaction?: Transaction | null
}

function TransactionDialog({ open, onOpenChange, initialTransaction }: TransactionDialogProps) {
  const { finance, addTransaction, editTransaction } = useFinance()
  const isEditing = Boolean(initialTransaction)

  const [description, setDescription] = useState(initialTransaction?.description ?? '')
  const [amount, setAmount] = useState(initialTransaction ? String(initialTransaction.amount) : '')
  const [category, setCategory] = useState<CategoryId>(initialTransaction?.category ?? 'food')
  const [day, setDay] = useState(initialTransaction ? String(initialTransaction.day) : String(finance.currentDay))
  const [errors, setErrors] = useState<{ description?: string; amount?: string; day?: string }>({})

  // Update form fields when opening dialog
  const resetForm = () => {
    setDescription(initialTransaction?.description ?? '')
    setAmount(initialTransaction ? String(initialTransaction.amount) : '')
    setCategory(initialTransaction?.category ?? 'food')
    setDay(initialTransaction ? String(initialTransaction.day) : String(finance.currentDay))
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { description?: string; amount?: string; day?: string } = {}

    if (!description.trim()) {
      newErrors.description = 'Please enter a description.'
    }

    const parsedAmount = parseAmount(amount)
    if (parsedAmount.error || parsedAmount.value <= 0) {
      newErrors.amount = parsedAmount.error || 'Enter an amount greater than ₹0.'
    }

    const parsedDay = Number(day)
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > finance.cycleLength) {
      newErrors.day = `Enter a day between 1 and ${finance.cycleLength}.`
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (isEditing && initialTransaction) {
      editTransaction(initialTransaction.id, {
        description: description.trim(),
        amount: parsedAmount.value,
        category,
        day: parsedDay,
      })
      toast.success('Transaction updated', {
        description: `${description.trim()} · ${formatINR(parsedAmount.value)} on Day ${parsedDay}.`,
      })
    } else {
      const newTx: Transaction = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: description.trim(),
        amount: parsedAmount.value,
        category,
        day: parsedDay,
      }
      addTransaction(newTx)
      toast.success('Transaction added', {
        description: `${description.trim()} · ${formatINR(parsedAmount.value)} recorded on Day ${parsedDay}.`,
      })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (val) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit transaction' : 'Add new transaction'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update details for this expense in your current cycle.'
              : 'Record a new spending transaction to update your remaining balance.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-desc" className="text-xs text-muted-foreground">
              Description
            </Label>
            <Input
              id="tx-desc"
              placeholder="e.g. Swiggy lunch, Metro pass"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 bg-surface"
              autoFocus
            />
            {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount" className="text-xs text-muted-foreground">
                Amount (₹)
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input
                  id="tx-amount"
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
              <Label htmlFor="tx-day" className="text-xs text-muted-foreground">
                Day of cycle (1–{finance.cycleLength})
              </Label>
              <Input
                id="tx-day"
                type="number"
                min={1}
                max={finance.cycleLength}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-10 bg-surface font-mono tabular-nums"
              />
              {errors.day && <p className="text-xs text-danger">{errors.day}</p>}
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
              {isEditing ? 'Save changes' : 'Add transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Transactions({ limit }: { limit?: number }) {
  const { finance, deleteTransaction } = useFinance()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all')

  const rawList = [...finance.transactions].sort((a, b) => b.day - a.day || b.id.localeCompare(a.id))
  const filteredList = selectedCategory === 'all'
    ? rawList
    : rawList.filter((t) => t.category === selectedCategory)

  const shown = limit ? filteredList.slice(0, limit) : filteredList

  const handleEdit = (tx: Transaction) => {
    setEditingTx(tx)
    setDialogOpen(true)
  }

  const handleDelete = (tx: Transaction) => {
    deleteTransaction(tx.id)
    toast.success('Transaction removed', {
      description: `${tx.description} (${formatINR(tx.amount)}) deleted from cycle.`,
    })
  }

  const handleOpenAdd = () => {
    setEditingTx(null)
    setDialogOpen(true)
  }

  return (
    <>
      <Panel aria-labelledby="tx-title">
        <PanelHeader
          id="tx-title"
          title={limit ? 'Recent transactions' : 'All transactions'}
          description={`${rawList.length} recorded this cycle`}
          action={
            <Button size="sm" onClick={handleOpenAdd} className="h-8 gap-1.5">
              <Plus className="size-3.5" />
              Add transaction
            </Button>
          }
        />

        {!limit && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({rawList.length})
            </button>
            {ALL_CATEGORIES.filter((c) => rawList.some((t) => t.category === c)).map((catId) => {
              const count = rawList.filter((t) => t.category === catId).length
              return (
                <button
                  key={catId}
                  type="button"
                  onClick={() => setSelectedCategory(catId)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === catId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{CATEGORIES[catId].label}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              )
            })}
          </div>
        )}

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No transactions found for this view.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((t) => (
              <li key={t.id} className="group flex items-center gap-3 py-2.5">
                <CategoryIcon category={t.category} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Day {t.day} · {CATEGORIES[t.category].label}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                    −{formatINR(t.amount)}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleEdit(t)}
                      aria-label={`Edit ${t.description}`}
                      className="size-7 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(t)}
                      aria-label={`Delete ${t.description}`}
                      className="size-7 text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialTransaction={editingTx}
      />
    </>
  )
}
