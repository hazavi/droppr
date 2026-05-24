"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { TrendingDown, SlidersHorizontal } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { useDeals } from "@/hooks/useDeals"
import { ProductGrid } from "@/components/product/product-grid"
import { EmptyState } from "@/components/shared/empty-state"
import type { TrackedItem } from "@/types"

type SortKey = "drop_percent" | "drop_recent" | "price_asc"

export default function DealsPage() {
  const { user } = useAuthContext()
  const { lists } = useLists(user?.uid ?? null)
  const { deals, loading } = useDeals(user?.uid ?? null)

  const [filterListId, setFilterListId] = useState<string>("all")
  const [filterMinPct, setFilterMinPct] = useState<number>(0)
  const [sortKey, setSortKey] = useState<SortKey>("drop_percent")

  const filtered = useMemo(() => {
    return deals
      .filter((item) => item.priceDropPercent >= filterMinPct)
      .sort((a, b) => {
        if (sortKey === "drop_percent") return b.priceDropPercent - a.priceDropPercent
        if (sortKey === "drop_recent")
          return b.lastChecked.getTime() - a.lastChecked.getTime()
        if (sortKey === "price_asc") return a.currentPrice - b.currentPrice
        return 0
      })
  }, [deals, filterMinPct, sortKey])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deals</h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? "Loading..." : `${filtered.length} item${filtered.length !== 1 ? "s" : ""} on sale`}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
      >
        <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0" />

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Min drop</label>
          <select
            value={filterMinPct}
            onChange={(e) => setFilterMinPct(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
          >
            <option value={0}>Any</option>
            <option value={5}>5%+</option>
            <option value={10}>10%+</option>
            <option value={20}>20%+</option>
            <option value={30}>30%+</option>
            <option value={50}>50%+</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Sort by</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
          >
            <option value="drop_percent">Biggest drop</option>
            <option value="drop_recent">Most recent</option>
            <option value="price_asc">Lowest price</option>
          </select>
        </div>
      </motion.div>

      {/* Grid */}
      <ProductGrid
        items={filtered}
        listId=""
        loading={loading}
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
