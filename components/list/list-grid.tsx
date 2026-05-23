"use client"

import { motion } from "framer-motion"
import { ListCard } from "./list-card"
import type { ItemList } from "@/types"

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

function ListCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-3 w-48 rounded bg-white/10" />
      </div>
    </div>
  )
}

interface ListGridProps {
  lists: ItemList[]
  loading?: boolean
  emptyState?: React.ReactNode
}

export function ListGrid({ lists, loading, emptyState }: ListGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ListCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (lists.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3"
    >
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </motion.div>
  )
}
