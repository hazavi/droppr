"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { TrendingDown, LayoutGrid, List, ChevronDown } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useDeals } from "@/hooks/useDeals"
import { ProductGrid } from "@/components/product/product-grid"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/components/product/product-grid"

type SortKey = "drop_percent" | "drop_recent" | "price_asc"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "drop_percent", label: "Biggest drop" },
  { value: "drop_recent",  label: "Most recent" },
  { value: "price_asc",    label: "Lowest price" },
]

const MIN_DROP_OPTIONS = [0, 5, 10, 20, 30, 50]

const VIEW_TOGGLE: { mode: ViewMode; Icon: typeof LayoutGrid; label: string }[] = [
  { mode: "4",    Icon: LayoutGrid, label: "4 per row" },
  { mode: "list", Icon: List,       label: "List view" },
]

export default function DealsPage() {
  const { user } = useAuthContext()
  const { deals, loading } = useDeals(user?.uid ?? null)

  const [filterMinPct, setFilterMinPct] = useState<number>(0)
  const [sortKey, setSortKey] = useState<SortKey>("drop_percent")
  const [viewMode, setViewMode] = useState<ViewMode>("4")

  const filtered = useMemo(() => {
    return deals
      .filter((item) => item.priceDropPercent >= filterMinPct)
      .sort((a, b) => {
        if (sortKey === "drop_percent") return b.priceDropPercent - a.priceDropPercent
        if (sortKey === "drop_recent")  return b.lastChecked.getTime() - a.lastChecked.getTime()
        if (sortKey === "price_asc")    return a.currentPrice - b.currentPrice
        return 0
      })
  }, [deals, filterMinPct, sortKey])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
        <p className="mt-1 text-sm text-slate-500">
          {loading ? "Loading..." : `${filtered.length} item${filtered.length !== 1 ? "s" : ""} on sale`}
        </p>
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Min drop filter */}
        <div className="relative flex items-center">
          <select
            value={filterMinPct}
            onChange={(e) => setFilterMinPct(Number(e.target.value))}
            className="appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white/70 py-1.5 pl-3 pr-7 text-xs font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {MIN_DROP_OPTIONS.map((v) => (
              <option key={v} value={v}>{v === 0 ? "Any drop" : `${v}%+ off`}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          {/* Sort */}
          <div className="relative flex items-center">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="appearance-none cursor-pointer rounded-lg border border-slate-200 bg-white/70 py-1.5 pl-3 pr-7 text-xs font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white/70 shadow-sm">
            {VIEW_TOGGLE.map(({ mode, Icon, label }, i) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={label}
                className={cn(
                  "flex h-8 w-8 items-center justify-center transition-colors",
                  i > 0 && "border-l border-slate-200",
                  viewMode === mode
                    ? "bg-slate-900 text-white"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <ProductGrid
        items={filtered}
        listId=""
        loading={loading}
        viewMode={viewMode}
        emptyState={
          <EmptyState
            icon={TrendingDown}
            title="No deals right now"
            description="Add items to your watchlists and we'll alert you when prices drop."
          />
        }
      />
    </div>
  )
}
