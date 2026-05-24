"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { TrackedItem } from "@/types"
import { formatPrice, formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { GlassEffect } from "@/components/ui/liquid-glass"

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

interface ProductCardProps {
  item: TrackedItem
  listId: string
  onDelete?: (id: string) => void
  isSelected?: boolean
  onSelect?: (id: string) => void
  priority?: boolean
}

export const ProductCard = memo(function ProductCard({
  item,
  isSelected,
  onSelect,
  priority = false,
}: ProductCardProps) {
  const hasDrop = item.priceDrop > 0

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <GlassEffect
        className={cn(
          "group relative flex flex-col rounded-2xl cursor-pointer",
          isSelected && "ring-2 ring-white/40"
        )}
      >
        {/* Select checkbox */}
        {onSelect && (
          <button
            onClick={() => onSelect(item.id)}
            className="absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 data-[selected=true]:opacity-100"
            data-selected={isSelected}
            aria-label={isSelected ? "Deselect item" : "Select item"}
          >
            {isSelected && (
              <span className="block h-2.5 w-2.5 rounded-sm bg-indigo-400" />
            )}
          </button>
        )}

        {/* Sale badge */}
        {hasDrop && (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
            Sale
          </span>
        )}

        {/* Product image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-slate-100">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              priority={priority}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-4xl opacity-20">📦</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {item.siteName}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-slate-800" title={item.name}>
              {item.name}
            </p>
          </div>

          {/* Pricing */}
          <div className="mt-auto">
            {hasDrop && (
              <span className="block text-xs text-slate-400 line-through font-mono">
                {formatPrice(item.originalPrice, item.currency)}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-lg font-bold font-mono",
                  hasDrop ? "text-emerald-600" : "text-slate-900"
                )}
              >
                {formatPrice(item.currentPrice, item.currency)}
              </span>
              {hasDrop && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  -{Math.round(item.priceDropPercent)}%
                </span>
              )}
            </div>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(item.lastChecked)}
            </span>
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              View <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </GlassEffect>
    </motion.div>
  )
})
