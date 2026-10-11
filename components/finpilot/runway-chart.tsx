'use client'

import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { useFinance } from '@/lib/finance/store'
import { buildRunway } from '@/lib/finance/calculations'
import { formatCompactINR, formatINR } from '@/lib/finance/format'
import { Panel, PanelHeader } from './primitives'

const config = {
  current: { label: 'Current plan', color: 'var(--chart-1)' },
  simulated: { label: 'After decision', color: 'var(--chart-3)' },
} satisfies ChartConfig

interface TooltipProps {
  active?: boolean
  label?: number | string
  payload?: { dataKey?: string | number; value?: number | null }[]
  currentDay: number
}

function RunwayTooltip({ active, payload, label, currentDay }: TooltipProps) {
  if (!active || !payload?.length) return null
  const day = Number(label)
  return (
    <div className="min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-foreground">
        Day {day}
        {day === currentDay ? ' · Today' : day < currentDay ? ' · Actual' : ' · Projected'}
      </p>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => {
          const key = p.dataKey as keyof typeof config
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ backgroundColor: config[key].color }} />
                {config[key].label}
              </span>
              <span className="font-mono font-medium tabular-nums text-foreground">{formatINR(p.value as number)}</span>
            </div>
          )
        })}
    </div>
  )
}

export function RunwayChart() {
  const { finance, plan, simulatedState, simulatedPlan } = useFinance()
  const data = useMemo(() => buildRunway(finance, simulatedState), [finance, simulatedState])
  const today = data.find((d) => d.day === finance.currentDay)

  const ticks = useMemo(() => {
    const len = finance.cycleLength
    const step = len <= 15 ? 3 : len <= 35 ? 5 : len <= 60 ? 10 : Math.round(len / 6)
    const result: number[] = [1]
    for (let d = step; d < len; d += step) {
      if (d > 1) result.push(d)
    }
    if (!result.includes(len)) result.push(len)
    return result
  }, [finance.cycleLength])

  return (
    <Panel aria-labelledby="runway-title">
      <PanelHeader
        id="runway-title"
        title={`${finance.cycleLength}-day financial runway`}
        description={`Projected end-of-day balance. Future days assume ${formatINR(plan.assumedDailySpend)}/day spending and bills paid on their due dates.`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="flex items-center gap-2 text-muted-foreground">
          <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: config.current.color }} />
          Current plan · ends {formatINR(plan.monthEnd)}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-0 w-5 border-t-2 border-dashed"
            style={{ borderColor: config.simulated.color, opacity: simulatedPlan ? 1 : 0.4 }}
          />
          {simulatedPlan ? `After decision · ends ${formatINR(simulatedPlan.monthEnd)}` : 'After decision (simulate to compare)'}
        </span>
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72">
        <LineChart data={data} margin={{ top: 16, right: 12, bottom: 18, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            type="number"
            domain={[1, finance.cycleLength]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            label={{ value: 'Day of cycle', position: 'insideBottom', offset: -12, className: 'fill-muted-foreground text-[11px]' }}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactINR}
            label={{ value: 'Balance (₹)', angle: -90, position: 'insideLeft', offset: 8, className: 'fill-muted-foreground text-[11px]' }}
          />
          <ReferenceLine y={0} stroke="var(--danger)" strokeOpacity={0.5} />
          <ReferenceLine
            x={finance.currentDay}
            stroke="var(--primary)"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{ value: 'Today', position: 'top', className: 'fill-primary text-[11px] font-medium' }}
          />
          <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<RunwayTooltip currentDay={finance.currentDay} />} />
          <Line dataKey="current" type="monotone" stroke="var(--color-current)" strokeWidth={2.25} dot={false} activeDot={{ r: 4 }} />
          <Line
            dataKey="simulated"
            type="monotone"
            stroke="var(--color-simulated)"
            strokeWidth={2.25}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {today && <ReferenceDot x={today.day} y={today.current} r={5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />}
        </LineChart>
      </ChartContainer>
    </Panel>
  )
}
