"use client"

import { memo } from "react"
import { motion } from "framer-motion"
import { ExternalLink, Clock, Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { TrackedItem } from "@/types"
import { formatPrice, formatRelativeTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { GlassEffect } from "@/components/ui/liquid-glass"
import type { ViewMode } from "./product-grid"

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
  selectionActive?: boolean
  priority?: boolean
  viewMode?: ViewMode
}

export const ProductCard = memo(function ProductCard({
  item,
  isSelected,
  onSelect,
  selectionActive,
  priority = false,
  viewMode = "4",
}: ProductCardProps) {
  const hasDrop = item.priceDrop > 0

  // ─── List row ────────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div
        onClick={onSelect ? () => onSelect(item.id) : undefined}
        className={cn(
          "group/row flex items-center gap-3 px-4 py-3 transition-colors",
          onSelect && "cursor-pointer",
          isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50/80",
        )}
      >
        {/* Checkbox */}
        {onSelect && (
          <div
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
              isSelected
                ? "border-indigo-500 bg-indigo-500"
                : "border-slate-200 bg-white",
              !selectionActive && !isSelected && "opacity-0 group-hover/row:opacity-100",
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </div>
        )}

        {/* Thumbnail */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {item.image && (item.image.startsWith("http://") || item.image.startsWith("https://")) ? (
            <Image src={item.image} alt={item.name} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl opacity-30">📦</div>
          )}
        </div>

        {/* Name + site */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{item.siteName}</p>
          <p className="truncate text-sm font-medium text-slate-800" title={item.name}>
            {item.name}
          </p>
        </div>

        {/* Price block */}
        <div className="shrink-0 text-right">
          {hasDrop && (
            <p className="font-mono text-xs text-slate-400 line-through">
              {formatPrice(item.originalPrice, item.currency)}
            </p>
          )}
          <div className="flex items-center justify-end gap-1.5">
            <span className={cn("font-mono text-sm font-bold", hasDrop ? "text-emerald-600" : "text-slate-900")}>
              {formatPrice(item.currentPrice, item.currency)}
            </span>
            {hasDrop && (
              <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                -{Math.round(item.priceDropPercent)}%
              </span>
            )}
          </div>
        </div>

        {/* Last checked + link */}
        <div className="shrink-0 flex items-center gap-1.5">
          <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(item.lastChecked)}
          </span>
          <Link
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Open product"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // ─── Card (4-col / 6-col) ───────────────────────────────────────────────────
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
          isSelected && "ring-2 ring-indigo-400/60",
        )}
      >
        {/* Select checkbox */}
        {onSelect && (
          <button
            onClick={() => onSelect(item.id)}
            className={cn(
              "absolute left-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-md border transition-all",
              isSelected
                ? "border-indigo-400 bg-indigo-500 opacity-100"
                : "border-white/30 bg-black/40",
              !selectionActive && !isSelected && "opacity-0 group-hover:opacity-100",
            )}
            aria-label={isSelected ? "Deselect item" : "Select item"}
          >
            {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </button>
        )}

        {/* Sale badge */}
        {hasDrop && (
          <span className="absolute right-3 top-3 z-10 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
            Sale
          </span>
        )}

        {/* Product image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-slate-100">
          {item.image && (item.image.startsWith("http://") || item.image.startsWith("https://")) ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              unoptimized
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
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {item.siteName}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-slate-800" title={item.name}>
              {item.name}
            </p>
          </div>

          {/* Pricing */}
          <div className="mt-auto">
            {hasDrop && (
              <span className="block font-mono text-xs text-slate-400 line-through">
                {formatPrice(item.originalPrice, item.currency)}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className={cn("font-mono text-lg font-bold", hasDrop ? "text-emerald-600" : "text-slate-900")}>
                {formatPrice(item.currentPrice, item.currency)}
              </span>
              {hasDrop && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                  -{Math.round(item.priceDropPercent)}%
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
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
