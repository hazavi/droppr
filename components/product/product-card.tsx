"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { TrendingDown, ExternalLink, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { TrackedItem } from "@/types"
import { formatPrice, formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
}

const hoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.01, transition: { duration: 0.2 } },
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
  listId,
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
      whileHover="hover"
    >
      <motion.div
        variants={hoverVariants}
        className={cn(
          "group relative flex flex-col rounded-xl border bg-white/5 backdrop-blur-sm transition-colors",
          "border-white/10 hover:border-white/20",
          isSelected && "border-indigo-500/60 bg-indigo-500/5"
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
          <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-400">
            <TrendingDown className="h-3 w-3" />
            -{item.priceDropPercent}%
          </span>
        )}

        {/* Product image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-white/5">
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
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {item.siteName}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-neutral-100">
              {item.name}
            </p>
          </div>

          {/* Pricing */}
          <div className="mt-auto">
            <div className="flex items-end gap-2">
              <span
                className={cn(
                  "text-lg font-bold font-mono",
                  hasDrop ? "text-green-400" : "text-neutral-100"
                )}
              >
                {formatPrice(item.currentPrice, item.currency)}
              </span>
              {hasDrop && (
                <span className="text-sm text-neutral-500 line-through font-mono">
                  {formatPrice(item.originalPrice, item.currency)}
                </span>
              )}
            </div>

            {hasDrop && (
              <p className="mt-0.5 text-xs text-green-500">
                Save {formatPrice(item.priceDrop, item.currency)}
              </p>
            )}
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="flex items-center gap-1 text-xs text-neutral-600">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(item.lastChecked)}
            </span>
            <Link
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-indigo-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
              onClick={(e) => e.stopPropagation()}
            >
              View <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})
