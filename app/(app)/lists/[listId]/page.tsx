"use client"

import { useState, use, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Trash2,
  MoveRight,
  Package,
  LayoutGrid,
  Grid3X3,
  List,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useItems } from "@/hooks/useItems"
import { useLists } from "@/hooks/useLists"
import { deleteItems, moveItems, getList } from "@/lib/firestore"
import { ProductGrid } from "@/components/product/product-grid"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"
import type { ItemList, TrackedItem } from "@/types"

type ViewMode = "4" | "6" | "list"
type SortBy = "newest" | "oldest" | "price-asc" | "price-desc" | "name" | "drop"

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "name", label: "Name (A–Z)" },
  { value: "drop", label: "Biggest drop" },
]

function sortItems(items: TrackedItem[], by: SortBy): TrackedItem[] {
  return [...items].sort((a, b) => {
    switch (by) {
      case "newest":    return b.createdAt.getTime() - a.createdAt.getTime()
      case "oldest":    return a.createdAt.getTime() - b.createdAt.getTime()
      case "price-asc": return a.currentPrice - b.currentPrice
      case "price-desc":return b.currentPrice - a.currentPrice
      case "name":      return a.name.localeCompare(b.name)
      case "drop":      return b.priceDropPercent - a.priceDropPercent
    }
  })
}

const VIEW_TOGGLE: { mode: ViewMode; Icon: typeof LayoutGrid; label: string }[] = [
  { mode: "4",    Icon: LayoutGrid, label: "4 per row" },
  { mode: "6",    Icon: Grid3X3,    label: "6 per row" },
  { mode: "list", Icon: List,       label: "List view" },
]

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>
}) {
  const { listId } = use(params)
  const { user } = useAuthContext()
  const { items, loading } = useItems(user?.uid ?? null, listId)
  const { lists } = useLists(user?.uid ?? null)
  const [list, setList] = useState<ItemList | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("4")
  const [sortBy, setSortBy] = useState<SortBy>("newest")

  useEffect(() => {
    if (!user) return
    getList(user.uid, listId).then(setList)
  }, [user, listId])

  const sorted = useMemo(() => sortItems(items, sortBy), [items, sortBy])
  const allSelected = sorted.length > 0 && selectedIds.length === sorted.length
  const otherLists = lists.filter((l) => l.id !== listId)

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(sorted.map((i) => i.id))
    }
  }

  async function handleDelete() {
    if (!user || selectedIds.length === 0) return
    setBulkLoading(true)
    try {
      await deleteItems(user.uid, listId, selectedIds)
      setSelectedIds([])
      toast.success(`Deleted ${selectedIds.length} item${selectedIds.length !== 1 ? "s" : ""}`)
    } catch {
      toast.error("Failed to delete items")
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleMove(toListId: string) {
    if (!user || selectedIds.length === 0) return
    setBulkLoading(true)
    try {
      await moveItems(user.uid, listId, toListId, selectedIds)
      setSelectedIds([])
      setShowMoveMenu(false)
      toast.success("Items moved")
    } catch {
      toast.error("Failed to move items")
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/lists"
          className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Lists
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{list?.name ?? "List"}</h1>
        {list?.category && (
          <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {list.category}
          </span>
        )}
      </motion.div>

      {/* Toolbar: select-all / sort / view toggle */}
      {!loading && sorted.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Sort */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="appearance-none rounded-lg border border-slate-200 bg-white/70 py-1.5 pl-3 pr-7 text-xs font-medium text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 cursor-pointer"
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
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm"
          >
            <span className="text-sm font-semibold text-slate-700">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 transition-colors hover:text-slate-700"
            >
              Clear
            </button>

            <div className="ml-auto flex items-center gap-2">
              {/* Move to */}
              <div className="relative">
                <button
                  onClick={() => setShowMoveMenu((v) => !v)}
                  disabled={bulkLoading || otherLists.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  <MoveRight className="h-3.5 w-3.5" />
                  Move to
                </button>
                <AnimatePresence>
                  {showMoveMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      {otherLists.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => handleMove(l.id)}
                          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {l.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product grid */}
      <ProductGrid
        items={sorted}
        listId={listId}
        loading={loading}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onSelect={toggleSelect}
        selectionActive={selectedIds.length > 0}
        emptyState={
          <EmptyState
            icon={Package}
            title="This list is empty"
            description="Track a product from the home page to add items here."
          />
        }
      />
    </div>
  )
}
