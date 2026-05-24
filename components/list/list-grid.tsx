"use client"

import { motion } from "framer-motion"
import { ListCard } from "./list-card"
import type { ItemList } from "@/types"

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const SKELETON_KEYS = Array.from({ length: 4 }, (_, i) => i)

function ListCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/50 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-3 w-16 rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="h-3 w-12 rounded bg-slate-200" />
        <div className="h-3 w-16 rounded bg-slate-100" />
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SKELETON_KEYS.map((i) => (
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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </motion.div>
  )
}
