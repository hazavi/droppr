"use client"

import { motion } from "framer-motion"
import { ProductCard } from "./product-card"
import { ProductCardSkeleton } from "./product-card-skeleton"
import type { TrackedItem } from "@/types"

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

interface ProductGridProps {
  items: TrackedItem[]
  listId: string
  loading?: boolean
  selectedIds?: string[]
  onSelect?: (id: string) => void
  emptyState?: React.ReactNode
}

export function ProductGrid({
  items,
  listId,
  loading,
  selectedIds,
  onSelect,
  emptyState,
}: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          listId={listId}
          isSelected={selectedIds?.includes(item.id)}
          onSelect={onSelect}
        />
      ))}
    </motion.div>
  )
}
