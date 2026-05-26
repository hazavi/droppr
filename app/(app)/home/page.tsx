"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { TrendingDown, Package, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { getRecentlyDropped, getRecentlyAdded } from "@/lib/firestore"
import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { TrackItemBox } from "@/components/dashboard/track-item-box"
import { cn } from "@/lib/utils"
import type { TrackedItem } from "@/types"

export default function DashboardPage() {
  const { user, profile } = useAuthContext()
  const [recentDrops, setRecentDrops] = useState<TrackedItem[]>([])
  const [recentAdded, setRecentAdded] = useState<TrackedItem[]>([])
  const [dropsLoading, setDropsLoading] = useState(true)
  const [addedLoading, setAddedLoading] = useState(true)

  // Drops carousel
  const dropsScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = dropsScrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  const scrollDrops = (dir: "left" | "right") => {
    dropsScrollRef.current?.scrollBy({ left: dir === "left" ? -288 : 288, behavior: "smooth" })
  }

  // Added carousel
  const addedScrollRef = useRef<HTMLDivElement>(null)
  const [canAddedScrollLeft, setCanAddedScrollLeft] = useState(false)
  const [canAddedScrollRight, setCanAddedScrollRight] = useState(false)

  const checkAddedScroll = useCallback(() => {
    const el = addedScrollRef.current
    if (!el) return
    setCanAddedScrollLeft(el.scrollLeft > 4)
    setCanAddedScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  const scrollAdded = (dir: "left" | "right") => {
    addedScrollRef.current?.scrollBy({ left: dir === "left" ? -288 : 288, behavior: "smooth" })
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      getRecentlyDropped(user.uid, 6),
      getRecentlyAdded(user.uid, 6),
    ]).then(([drops, added]) => {
      if (cancelled) return
      setRecentDrops(drops)
      setRecentAdded(added)
    }).finally(() => {
      if (!cancelled) {
        setDropsLoading(false)
        setAddedLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [user])

  // Recheck scroll arrows after items load
  useEffect(() => {
    const id = setTimeout(checkScroll, 50)
    return () => clearTimeout(id)
  }, [recentDrops, checkScroll])

  useEffect(() => {
    const id = setTimeout(checkAddedScroll, 50)
    return () => clearTimeout(id)
  }, [recentAdded, checkAddedScroll])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="mx-auto max-w-4xl space-y-10">

      {/* Header — logo + greeting */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Image
            src="/droppr.png"
            alt="droppr"
            width={48}
            height={48}
            className="object-contain"
            priority
          />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">droppr</p>
            <h1 className="text-lg font-bold leading-tight text-slate-900">
              {greeting}, {profile?.displayName?.split(" ")[0] ?? "there"} 👋
            </h1>
          </div>
        </div>
      </motion.header>

      {/* Track item prompt */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
      >
        <TrackItemBox />
      </motion.div>

      {/* Recently Dropped */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recently Dropped</h2>
          {recentDrops.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollDrops("left")}
                aria-label="Scroll left"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900",
                  !canScrollLeft && "opacity-35 pointer-events-none",
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => scrollDrops("right")}
                aria-label="Scroll right"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900",
                  !canScrollRight && "opacity-35 pointer-events-none",
                )}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {dropsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 shrink-0"><ProductCardSkeleton imageAspect="aspect-square" /></div>
            ))}
          </div>
        ) : recentDrops.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No price drops yet"
            description="We check your tracked items every 6 hours and notify you when prices fall."
          />
        ) : (
          <div
            ref={dropsScrollRef}
            onScroll={checkScroll}
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide [scroll-snap-type:x_mandatory] touch-pan-x"
          >
            {recentDrops.map((item, i) => (
              <div key={item.id} className="w-64 shrink-0 [scroll-snap-align:start]">
                <ProductCard item={item} listId="" priority={i < 3} imageAspect="aspect-square" />
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* Recently Added */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.18 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recently Added</h2>
          {recentAdded.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => scrollAdded("left")}
                aria-label="Scroll left"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900",
                  !canAddedScrollLeft && "opacity-35 pointer-events-none",
                )}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => scrollAdded("right")}
                aria-label="Scroll right"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all hover:border-slate-300 hover:text-slate-900",
                  !canAddedScrollRight && "opacity-35 pointer-events-none",
                )}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {addedLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 shrink-0"><ProductCardSkeleton imageAspect="aspect-square" /></div>
            ))}
          </div>
        ) : recentAdded.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nothing tracked yet"
            description="Paste a product URL above to start tracking its price."
          />
        ) : (
          <div
            ref={addedScrollRef}
            onScroll={checkAddedScroll}
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide [scroll-snap-type:x_mandatory] touch-pan-x"
          >
            {recentAdded.map((item, i) => (
              <div key={item.id} className="w-64 shrink-0 [scroll-snap-align:start]">
                <ProductCard item={item} listId="" priority={i < 3} imageAspect="aspect-square" />
              </div>
            ))}
          </div>
        )}
      </motion.section>

    </div>
  )
}
