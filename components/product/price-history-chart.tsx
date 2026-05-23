"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"
import type { PricePoint } from "@/types"
import { formatPrice } from "@/lib/utils"

interface PriceHistoryChartProps {
  data: PricePoint[]
  currency: string
}

interface TooltipPayloadEntry {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  currency: string
}

function CustomTooltip({ active, payload, label, currency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-semibold text-neutral-100">
        {formatPrice(payload[0].value, currency)}
      </p>
    </div>
  )
}

export function PriceHistoryChart({ data, currency }: PriceHistoryChartProps) {
  const { chartData, minPrice, maxPrice, padding } = useMemo(() => {
    const chartData = data.map((p) => ({
      date: p.recordedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: p.price,
    }))
    const prices = data.map((p) => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const padding = (maxPrice - minPrice) * 0.2 || 1
    return { chartData, minPrice, maxPrice, padding }
  }, [data])

  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
        Not enough history yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#555" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          tick={{ fontSize: 11, fill: "#555" }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v: number) => formatPrice(v, currency)}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#priceGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
