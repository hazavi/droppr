"use client"

import { useState, use, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Plus, Trash2, MoveRight, Package } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useItems } from "@/hooks/useItems"
import { useLists } from "@/hooks/useLists"
import { deleteItems, moveItems, getList } from "@/lib/firestore"
import { ProductGrid } from "@/components/product/product-grid"
import { AddItemModal } from "@/components/modals/add-item-modal"
import { EmptyState } from "@/components/shared/empty-state"
import type { ItemList } from "@/types"

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
  const [showAdd, setShowAdd] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  useEffect(() => {
    if (!user) return
    getList(user.uid, listId).then(setList)
  }, [user, listId])

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
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

  const otherLists = lists.filter((l) => l.id !== listId)

  return (
    <div className="space-y-6">
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {list?.name ?? "List"}
            </h1>
            {list?.category && (
              <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {list.category}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </motion.div>

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm"
          >
            <span className="text-sm font-medium text-slate-700">
              {selectedIds.length} selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowMoveMenu((v) => !v)}
                  disabled={bulkLoading || otherLists.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
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
                      className="absolute right-0 top-8 z-20 min-w-[160px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
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
              <button
                onClick={handleDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
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
        items={items}
        listId={listId}
        loading={loading}
        selectedIds={selectedIds}
        onSelect={toggleSelect}
        emptyState={
          <EmptyState
            icon={Package}
            title="This list is empty"
            description="Add a product URL to start tracking prices in this list."
            action={
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add first item
              </button>
            }
          />
        }
      />

      <AddItemModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        lists={lists}
        defaultListId={listId}
      />
    </div>
  )
}
