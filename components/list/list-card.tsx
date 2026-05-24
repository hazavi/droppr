"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import type { ItemList } from "@/types"
import { formatRelativeTime, toSlug } from "@/lib/utils"
import { GlassEffect } from "@/components/ui/liquid-glass"
import { ListIconDisplay } from "@/components/list/list-icon-map"
import { EditListModal } from "@/components/modals/edit-list-modal"

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

interface ListCardProps {
  list: ItemList
}

export function ListCard({ list }: ListCardProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="relative group/card">
      {/* Edit button — fades in on hover */}
      <button
        onClick={() => setEditOpen(true)}
        aria-label="Edit list"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-400 shadow-sm opacity-0 transition-all group-hover/card:opacity-100 hover:text-slate-700"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      <Link href={`/lists/${toSlug(list.name)}`} className="group block">
        <GlassEffect className="rounded-2xl transition-all duration-300 hover:scale-[1.01]">
          <div className="p-5">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <ListIconDisplay list={list} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{list.name}</p>
                <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {list.category}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-sm font-semibold text-slate-700">
                {list.itemCount ?? 0} {(list.itemCount ?? 0) === 1 ? "item" : "items"}
              </span>
              <span className="text-xs text-slate-400">{formatRelativeTime(list.createdAt)}</span>
            </div>
          </div>
        </GlassEffect>
      </Link>

      <EditListModal open={editOpen} onClose={() => setEditOpen(false)} list={list} />
    </motion.div>
  )
}

