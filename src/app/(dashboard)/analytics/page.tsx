'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type MonthData = {
  month: string
  label: string
  categories: Record<string, number>
  total: number
}

type DrilldownTx = {
  id: string
  occurred_at: string
  email_received_at?: string | null
  amount: number
  merchant_raw: string
  status: string
  bank_ref_id: string
}

type TimeRange = '3m' | 'ytd' | '12m' | 'ly'

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '3m': 'Last 3 months',
  ytd: 'Year to date',
  '12m': 'Last 12 months',
  ly: 'Last year',
}

const PALETTE = [
  '#ff692d', '#30a46c', '#00a2c7', '#8b5cf6',
  '#f59e0b', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#e5484d', '#06b6d4', '#d97706',
]

function catColor(category: string, allCats: string[]): string {
  const i = allCats.indexOf(category)
  return PALETTE[i < 0 ? 0 : i % PALETTE.length]
}

function fmtINR(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`
  return `₹${value.toFixed(0)}`
}

function fmtINRFull(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  })
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  if (y === new Date().getFullYear()) {
    return date.toLocaleDateString('en-IN', { month: 'short' })
  }
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function filterByRange(months: MonthData[], range: TimeRange): MonthData[] {
  const now = new Date()
  const y = now.getFullYear()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toKey = (year: number, month: number) => `${year}-${pad(month)}`

  switch (range) {
    case '3m': {
      const d = new Date(y, now.getMonth() - 2, 1)
      const start = toKey(d.getFullYear(), d.getMonth() + 1)
      return months.filter((m) => m.month >= start)
    }
    case 'ytd':
      return months.filter((m) => m.month.startsWith(`${y}-`))
    case '12m': {
      const d = new Date(y, now.getMonth() - 11, 1)
      const start = toKey(d.getFullYear(), d.getMonth() + 1)
      return months.filter((m) => m.month >= start)
    }
    case 'ly':
      return months.filter((m) => m.month.startsWith(`${y - 1}-`))
  }
}

export default function AnalyticsPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'monthly' | 'timeseries'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [timeRange, setTimeRange] = useState<TimeRange>('3m')

  // Drilldown state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [drilldownTxs, setDrilldownTxs] = useState<DrilldownTx[]>([])
  const [drilldownLoading, setDrilldownLoading] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(async () => {
      setIsLoading(true)
      const res = await fetch('/api/analytics')
      const json = await res.json()
      const data: MonthData[] = json.months ?? []
      setMonths(data)
      if (data.length > 0) setSelectedMonth(data[data.length - 1].month)
      setIsLoading(false)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  // Reset drilldown when month changes
  useEffect(() => {
    setSelectedCategory(null)
    setDrilldownTxs([])
  }, [selectedMonth])

  async function handleCategoryClick(category: string) {
    if (selectedCategory === category) {
      setSelectedCategory(null)
      setDrilldownTxs([])
      return
    }
    setSelectedCategory(category)
    setDrilldownLoading(true)
    const res = await fetch(
      `/api/analytics/transactions?month=${selectedMonth}&category=${encodeURIComponent(category)}`
    )
    const json = await res.json()
    setDrilldownTxs(json.transactions ?? [])
    setDrilldownLoading(false)
  }

  const allCategories = useMemo(
    () => [...new Set(months.flatMap((m) => Object.keys(m.categories)))].sort(),
    [months]
  )

  // Monthly tab data
  const currentMonthData = useMemo(
    () => months.find((m) => m.month === selectedMonth),
    [months, selectedMonth]
  )
  const monthlyChartData = useMemo(() => {
    if (!currentMonthData) return []
    return Object.entries(currentMonthData.categories)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({ name, amount }))
  }, [currentMonthData])

  // Time series tab data
  const rangeMonths = useMemo(() => filterByRange(months, timeRange), [months, timeRange])
  const rangeCategories = useMemo(
    () => [...new Set(rangeMonths.flatMap((m) => Object.keys(m.categories)))].sort(),
    [rangeMonths]
  )
  const timeSeriesData = useMemo(
    () =>
      rangeMonths.map((m) => ({
        month: formatMonthLabel(m.month),
        ...m.categories,
      })),
    [rangeMonths]
  )

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-[24px] md:text-[28px] leading-tight tracking-[-0.5px] text-foreground">
          Analytics
        </h1>
        <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
          Spending breakdown by category
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        {(['monthly', 'timeseries'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-md text-[13px] font-medium transition-all',
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'monthly' ? 'Monthly' : 'Time Series'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-[13px] text-muted-foreground">
          Loading analytics…
        </div>
      ) : months.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-card p-12 text-center text-[13px] text-muted-foreground">
          No categorized transactions found. Assign categories to your transactions to see analytics.
        </div>
      ) : (
        <>
          {/* ── Monthly Tab ── */}
          {tab === 'monthly' && (
            <div className="space-y-4">
              {/* Month selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="month-select" className="text-[13px] text-muted-foreground shrink-0">
                  Month
                </label>
                <select
                  id="month-select"
                  className="h-8 rounded-lg border border-border bg-card text-[13px] text-foreground px-2 pr-7 focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23777573' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                  }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {[...months].reverse().map((m) => (
                    <option key={m.month} value={m.month}>
                      {formatMonthLabel(m.month)}
                    </option>
                  ))}
                </select>
              </div>

              {currentMonthData && (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* Summary strip */}
                  <div className="px-5 py-4 border-b border-border flex items-baseline justify-between gap-4">
                    <p className="text-[13px] text-muted-foreground">
                      {formatMonthLabel(currentMonthData.month)} · {monthlyChartData.length} categories
                    </p>
                    <p className="text-[22px] font-semibold text-foreground leading-none">
                      {fmtINRFull(currentMonthData.total)}
                    </p>
                  </div>

                  {/* Chart */}
                  <div className="p-4 pt-5">
                    <ResponsiveContainer width="100%" height={Math.max(200, monthlyChartData.length * 44)}>
                      <BarChart
                        layout="vertical"
                        data={monthlyChartData}
                        margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={fmtINR}
                          tick={{ fontSize: 11, fill: '#777573' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#22201d' }}
                          axisLine={false}
                          tickLine={false}
                          width={130}
                        />
                        <Tooltip
                          formatter={(v) => [fmtINRFull(v as number), 'Amount']}
                          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                          contentStyle={{
                            fontSize: 12,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--card)',
                          }}
                        />
                        <Bar
                          dataKey="amount"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={28}
                          style={{ cursor: 'pointer' }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onClick={(data: any) => handleCategoryClick(data.name as string)}
                        >
                          {monthlyChartData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={catColor(entry.name, allCategories)}
                              opacity={
                                selectedCategory && selectedCategory !== entry.name ? 0.35 : 1
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category breakdown table */}
                  <div className="border-t border-border">
                    {monthlyChartData.map((entry, i) => {
                      const isSelected = selectedCategory === entry.name
                      const isDimmed = selectedCategory !== null && !isSelected
                      return (
                        <button
                          key={entry.name}
                          className={cn(
                            'w-full flex items-center justify-between px-5 py-2.5 text-[13px] text-left transition-colors',
                            i > 0 && 'border-t border-border/50',
                            isSelected
                              ? 'bg-muted/60'
                              : 'hover:bg-muted/30',
                            isDimmed && 'opacity-40'
                          )}
                          onClick={() => handleCategoryClick(entry.name)}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: catColor(entry.name, allCategories) }}
                            />
                            <span className={cn('text-foreground', isSelected && 'font-medium')}>
                              {entry.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium text-foreground">{fmtINRFull(entry.amount)}</span>
                            <span className="text-muted-foreground ml-2 text-[11px]">
                              {((entry.amount / currentMonthData.total) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Drilldown panel */}
                  {selectedCategory && (
                    <div className="border-t border-border">
                      {/* Drilldown header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: catColor(selectedCategory, allCategories) }}
                          />
                          <span className="text-[13px] font-medium text-foreground">
                            {selectedCategory}
                          </span>
                          {!drilldownLoading && (
                            <span className="text-[12px] text-muted-foreground">
                              · {drilldownTxs.length} transaction{drilldownTxs.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCategory(null)
                            setDrilldownTxs([])
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          aria-label="Close drilldown"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Drilldown transactions */}
                      {drilldownLoading ? (
                        <div className="px-5 py-6 text-center text-[13px] text-muted-foreground">
                          Loading…
                        </div>
                      ) : drilldownTxs.length === 0 ? (
                        <div className="px-5 py-6 text-center text-[13px] text-muted-foreground">
                          No transactions found.
                        </div>
                      ) : (
                        drilldownTxs.map((tx, i) => (
                          <div
                            key={tx.id}
                            className={cn(
                              'flex items-center justify-between px-5 py-3',
                              i > 0 && 'border-t border-border/40'
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] text-foreground font-medium truncate">
                                {tx.merchant_raw}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {fmtDate(tx.email_received_at ?? tx.occurred_at)}
                              </p>
                            </div>
                            <p className="text-[13px] font-semibold text-foreground shrink-0 ml-4">
                              {fmtINRFull(tx.amount)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Time Series Tab ── */}
          {tab === 'timeseries' && (
            <div className="space-y-4">
              {/* Time range selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTimeRange(key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all',
                      timeRange === key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {rangeMonths.length === 0 ? (
                <div className="rounded-xl border border-border border-dashed bg-card p-10 text-center text-[13px] text-muted-foreground">
                  No data for this time range.
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  {/* Summary strip */}
                  <div className="px-5 py-4 border-b border-border flex items-baseline justify-between gap-4 flex-wrap">
                    <p className="text-[13px] text-muted-foreground">
                      {TIME_RANGE_LABELS[timeRange]} · {rangeMonths.length}{' '}
                      {rangeMonths.length === 1 ? 'month' : 'months'}
                    </p>
                    <p className="text-[22px] font-semibold text-foreground leading-none">
                      {fmtINRFull(rangeMonths.reduce((s, m) => s + m.total, 0))}
                    </p>
                  </div>

                  {/* Stacked bar chart */}
                  <div className="p-4 pt-5 overflow-x-auto">
                    <div style={{ minWidth: Math.max(300, rangeMonths.length * 80) }}>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={timeSeriesData}
                          margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                          barCategoryGap="25%"
                        >
                          <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.06)" />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: '#777573' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tickFormatter={fmtINR}
                            tick={{ fontSize: 11, fill: '#777573' }}
                            axisLine={false}
                            tickLine={false}
                            width={52}
                          />
                          <Tooltip
                            formatter={(v, name) => [fmtINRFull(v as number), name as string]}
                            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                            contentStyle={{
                              fontSize: 12,
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'var(--card)',
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                            formatter={(value) => (
                              <span style={{ color: '#22201d' }}>{value}</span>
                            )}
                          />
                          {rangeCategories.map((cat) => (
                            <Bar
                              key={cat}
                              dataKey={cat}
                              stackId="stack"
                              fill={catColor(cat, allCategories)}
                              radius={
                                cat === rangeCategories[rangeCategories.length - 1]
                                  ? [4, 4, 0, 0]
                                  : [0, 0, 0, 0]
                              }
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Per-category totals for the range */}
                  <div className="border-t border-border">
                    {rangeCategories
                      .map((cat) => ({
                        name: cat,
                        amount: rangeMonths.reduce((s, m) => s + (m.categories[cat] ?? 0), 0),
                      }))
                      .sort((a, b) => b.amount - a.amount)
                      .map((entry, i) => (
                        <div
                          key={entry.name}
                          className={cn(
                            'flex items-center justify-between px-5 py-2.5 text-[13px]',
                            i > 0 && 'border-t border-border/50'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: catColor(entry.name, allCategories) }}
                            />
                            <span className="text-foreground">{entry.name}</span>
                          </div>
                          <span className="font-medium text-foreground">{fmtINRFull(entry.amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
