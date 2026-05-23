"use client"

import { motion } from "framer-motion"
import { FolderOpen, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ItemList } from "@/types"
import { formatRelativeTime } from "@/lib/utils"

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
      <Link href={`/lists/${list.id}`} className="group block">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.07]">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15">
              <FolderOpen className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-neutral-100">{list.name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                <span className="rounded-md bg-white/5 px-1.5 py-0.5">{list.category}</span>
                <span>·</span>
                <span>{list.itemCount ?? 0} item{list.itemCount !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{formatRelativeTime(list.createdAt)}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-400" />
        </div>
      </Link>
    </motion.div>
  )
}
