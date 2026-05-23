"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Package, TrendingDown, FolderOpen, PlusCircle } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { getRecentlyDropped, getRecentlyAdded } from "@/lib/firestore"
import { StatCard } from "@/components/shared/stat-card"
import { ProductCard } from "@/components/product/product-card"
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import type { TrackedItem } from "@/types"

export default function DashboardPage() {
  const { user, profile } = useAuthContext()
  const { lists, loading: listsLoading } = useLists(user?.uid ?? null)
  const [recentDrops, setRecentDrops] = useState<TrackedItem[]>([])
  const [recentAdded, setRecentAdded] = useState<TrackedItem[]>([])
  const [dropsLoading, setDropsLoading] = useState(true)
  const [addedLoading, setAddedLoading] = useState(true)

  const totalItems = lists.reduce((acc, l) => acc + (l.itemCount ?? 0), 0)
  const activeDeals = recentDrops.length

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
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-neutral-100">
          {greeting}, {profile?.displayName?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Here&apos;s what&apos;s happening with your tracked items.
        </p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Items tracked"
          value={listsLoading ? "—" : totalItems}
          icon={Package}
        />
        <StatCard
          label="Active deals"
          value={dropsLoading ? "—" : activeDeals}
          icon={TrendingDown}
          trend={activeDeals > 0 ? `${activeDeals} item${activeDeals !== 1 ? "s" : ""} on sale` : undefined}
          trendUp
        />
        <StatCard
          label="Lists"
          value={listsLoading ? "—" : lists.length}
          icon={FolderOpen}
        />
      </div>

      {/* Recently dropped */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-200">Recently Dropped</h2>
          {activeDeals > 0 && (
            <Link
              href="/deals"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              View all deals →
            </Link>
          )}
        </div>

        {dropsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-52 shrink-0">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : recentDrops.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No price drops yet"
            description="We'll check your tracked items every 6 hours and notify you when prices drop."
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {recentDrops.map((item) => (
              <div key={item.id} className="w-52 shrink-0">
                <ProductCard item={item} listId="" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recently added */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-200">Recently Added</h2>
        </div>

        {addedLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : recentAdded.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items yet"
            description="Start by adding a product URL to begin tracking its price."
            action={
              <Link
                href="/add"
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                Add your first item
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {recentAdded.map((item) => (
              <ProductCard key={item.id} item={item} listId="" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
