import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { RISK_LABEL } from '@/lib/finance/format'
import { CATEGORIES } from '@/lib/finance/categories'
import type { CategoryId, RiskLevel } from '@/lib/finance/types'

export function Panel({ className, children, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_0_oklch(1_0_0/4%)_inset] sm:p-6', className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  description,
  action,
  id,
}: {
  title: string
  description?: string
  action?: ReactNode
  id?: string
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const riskStyles: Record<RiskLevel, string> = {
  healthy: 'bg-positive/12 text-positive ring-positive/25',
  comfortable: 'bg-positive/12 text-positive ring-positive/25',
  safe: 'bg-positive/12 text-positive ring-positive/25',
  tight: 'bg-caution/12 text-caution ring-caution/25',
  stretched: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  high: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  critical: 'bg-danger/15 text-danger ring-danger/30',
  deficit: 'bg-danger/15 text-danger ring-danger/30',
}

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        riskStyles[risk],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {RISK_LABEL[risk]}
    </span>
  )
}

export function CategoryIcon({ category, className }: { category: CategoryId; className?: string }) {
  const meta = CATEGORIES[category]
  const Icon = meta.icon
  return (
    <span
      aria-hidden
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', className)}
      style={{ backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)`, color: meta.color }}
    >
      <Icon className="size-4" />
    </span>
  )
}

export function Meter({
  segments,
  label,
  className,
}: {
  segments: { value: number; color: string; label: string }[]
  label: string
  className?: string
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1
  return (
    <div role="img" aria-label={label} className={cn('flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted', className)}>
      {segments.map((seg) => (
        <span
          key={seg.label}
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${(Math.max(0, seg.value) / total) * 100}%`, backgroundColor: seg.color }}
        />
      ))}
    </div>
  )
}
