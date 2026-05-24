"use client"

import { motion } from "framer-motion"
import { FolderOpen, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ItemList } from "@/types"
import { formatRelativeTime, toSlug } from "@/lib/utils"
import { GlassEffect } from "@/components/ui/liquid-glass"

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

interface ListCardProps {
  list: ItemList
}

export function ListCard({ list }: ListCardProps) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible">
      <Link href={`/lists/${toSlug(list.name)}`} className="group block">
        <GlassEffect className="rounded-2xl transition-all duration-300 hover:scale-[1.01]">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <FolderOpen className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{list.name}</p>
                  <span className="mt-0.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {list.category}
                  </span>
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
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
    </motion.div>
  )
}
