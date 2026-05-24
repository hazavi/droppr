"use client"

import { motion } from "framer-motion"
import { ProductCard } from "./product-card"
import { ProductCardSkeleton } from "./product-card-skeleton"
import type { TrackedItem } from "@/types"
import { cn } from "@/lib/utils"

export type ViewMode = "4" | "6" | "list"

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => i)

interface ProductGridProps {
  items: TrackedItem[]
  listId: string
  loading?: boolean
  selectedIds?: string[]
  onSelect?: (id: string) => void
  selectionActive?: boolean
  viewMode?: ViewMode
  emptyState?: React.ReactNode
}

export function ProductGrid({
  items,
  listId,
  loading,
  selectedIds,
  onSelect,
  selectionActive,
  viewMode = "4",
  emptyState,
}: ProductGridProps) {
  const colsClass =
    viewMode === "6"
      ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

  if (loading) {
    return (
      <div className={cn("grid gap-4", colsClass)}>
        {SKELETON_KEYS.map((i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <>{emptyState}</>
  }

  if (viewMode === "list") {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-md divide-y divide-slate-100">
        {items.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            listId={listId}
            viewMode="list"
            isSelected={selectedIds?.includes(item.id)}
            onSelect={onSelect}
            selectionActive={selectionActive}
          />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("grid gap-4", colsClass)}
    >
      {items.map((item, index) => (
        <ProductCard
          key={item.id}
          item={item}
          listId={listId}
          priority={index === 0}
          viewMode={viewMode}
          isSelected={selectedIds?.includes(item.id)}
          onSelect={onSelect}
          selectionActive={selectionActive}
        />
      ))}
    </motion.div>
  )
}
