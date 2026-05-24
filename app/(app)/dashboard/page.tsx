"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { TrendingDown, Package } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { getRecentlyDropped, getRecentlyAdded } from "@/lib/firestore"
import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { TrackItemBox } from "@/components/dashboard/track-item-box"
import type { TrackedItem } from "@/types"

export default function DashboardPage() {
  const { user, profile } = useAuthContext()
  const { lists } = useLists(user?.uid ?? null)
  const [recentDrops, setRecentDrops] = useState<TrackedItem[]>([])
  const [recentAdded, setRecentAdded] = useState<TrackedItem[]>([])
  const [dropsLoading, setDropsLoading] = useState(true)
  const [addedLoading, setAddedLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setDropsLoading(true)
    setAddedLoading(true)
    Promise.all([
      getRecentlyDropped(user.uid, 6),
      getRecentlyAdded(user.uid, 6),
    ]).then(([drops, added]) => {
      setRecentDrops(drops)
      setRecentAdded(added)
    }).finally(() => {
      setDropsLoading(false)
      setAddedLoading(false)
    })
  }, [user])

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
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-500" strokeWidth={2} />
            <h2 className="text-sm font-semibold text-slate-800">Recently Dropped</h2>
          </div>
          {recentDrops.length > 0 && (
            <Link href="/deals" className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
              View all →
            </Link>
          )}
        </div>

        {dropsLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-48 shrink-0"><ProductCardSkeleton /></div>
            ))}
          </div>
        ) : recentDrops.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No price drops yet"
            description="We check your tracked items every 6 hours and notify you when prices fall."
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {recentDrops.map((item, i) => (
              <div key={item.id} className="w-48 shrink-0">
                <ProductCard item={item} listId="" priority={i < 3} />
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
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-indigo-500" strokeWidth={2} />
          <h2 className="text-sm font-semibold text-slate-800">Recently Added</h2>
        </div>

        {addedLoading ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : recentAdded.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nothing tracked yet"
            description="Paste a product URL above to start tracking its price."
          />
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recentAdded.map((item, i) => (
              <ProductCard key={item.id} item={item} listId="" priority={i < 3} />
            ))}
          </div>
        )}
      </motion.section>

    </div>
  )
}
