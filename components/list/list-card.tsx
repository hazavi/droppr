"use client"

import { motion } from "framer-motion"
import { FolderOpen, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ItemList } from "@/types"
import { formatRelativeTime } from "@/lib/utils"
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
      <Link href={`/lists/${list.id}`} className="group block">
        <GlassEffect className="rounded-2xl transition-all duration-300 hover:scale-[1.01]">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <FolderOpen className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="font-semibold text-white">{list.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5">{list.category}</span>
                  <span>·</span>
                  <span>{list.itemCount ?? 0} item{list.itemCount !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(list.createdAt)}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
          </div>
        </GlassEffect>
      </Link>
    </motion.div>
  )
}
