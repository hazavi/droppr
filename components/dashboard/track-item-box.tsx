"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CheckCircle, ChevronDown, Plus, Loader2, FolderOpen, Bell } from "lucide-react"
import { toast } from "sonner"
import { PromptInputBox } from "@/components/ui/ai-prompt-box"
import { GlassEffect } from "@/components/ui/liquid-glass"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { addItem } from "@/lib/firestore"
import { CreateListModal } from "@/components/modals/create-list-modal"
import { formatPrice } from "@/lib/utils"
import type { ScrapeResult, ScrapeError, AlertType } from "@/types"

type AlertMode = "any" | "percent" | "fixed"

export function TrackItemBox() {
  const { user } = useAuthContext()
  const router = useRouter()
  const { lists } = useLists(user?.uid ?? null)

  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped] = useState<(ScrapeResult & { url: string }) | null>(null)
  const [selectedListId, setSelectedListId] = useState("")
  const [alertMode, setAlertMode] = useState<AlertMode>("any")
  const [alertValue, setAlertValue] = useState(10)
  const [saving, setSaving] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)
  const [done, setDone] = useState(false)

  // Default to first list once lists are loaded
  useEffect(() => {
    if (lists.length > 0 && !selectedListId) {
      setSelectedListId(lists[0].id)
    }
  }, [lists, selectedListId])

  async function handleSubmit({ url }: { url: string }) {
    if (!url.startsWith("http")) {
      toast.error("Enter a valid product URL")
      return
    }
    setScraping(true)
    setScraped(null)
    setDone(false)
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-secret": process.env.NEXT_PUBLIC_SCRAPER_SECRET ?? "",
        },
        body: JSON.stringify({ url }),
      })
      const data = (await res.json()) as ScrapeResult | ScrapeError
      if ("error" in data) {
        toast.error(data.message)
        return
      }
      setScraped({ ...data, url })
    } catch {
      toast.error("Failed to fetch product info")
    } finally {
      setScraping(false)
    }
  }

  async function handleSave() {
    if (!user || !scraped) return
    if (!selectedListId) {
      toast.error("Please select a list first")
      return
    }
    setSaving(true)
    try {
      const firestoreAlertType: AlertType = alertMode === "any" ? "any" : alertMode
      const firestoreAlertValue = alertMode === "any" ? 0 : alertValue

      await addItem(user.uid, selectedListId, {
        url: scraped.url,
        name: scraped.name,
        image: scraped.image,
        siteName: scraped.siteName,
        currentPrice: scraped.price,
        originalPrice: scraped.price,
        currency: scraped.currency,
        alertType: firestoreAlertType,
        alertValue: firestoreAlertValue,
        onSale: false,
        priceDrop: 0,
        priceDropPercent: 0,
      })
      setDone(true)
      toast.success("Now tracking " + scraped.name)
      setTimeout(() => {
        router.push(`/lists/${selectedListId}`)
      }, 1200)
    } catch {
      toast.error("Failed to add item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <div className="mx-auto w-full max-w-2xl space-y-3">
        {/* Prompt box */}
        <PromptInputBox
          onSubmit={handleSubmit}
          isLoading={scraping}
          placeholder="Paste a product URL to track its price…"
          className="w-full"
        />

        {/* Result preview */}
        <AnimatePresence>
          {scraped && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <GlassEffect className="rounded-2xl overflow-hidden">
                {/* Product preview row */}
                <div className="flex items-center gap-4 p-4">
                  {scraped.image && (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <Image
                        src={scraped.image}
                        alt={scraped.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="select-none text-xs font-medium uppercase tracking-wider text-slate-400">
                      {scraped.siteName}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                      {scraped.name}
                    </p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-slate-900">
                      {formatPrice(scraped.price, scraped.currency)}
                    </p>
                  </div>

                  {/* Done checkmark */}
                  <AnimatePresence>
                    {done && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100"
                      >
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Config row */}
                {!done && (
                  <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                    {/* List selector */}
                    <div className="flex-1 min-w-[150px] space-y-1.5">
                      <p className="select-none flex items-center gap-1.5 text-xs text-slate-400">
                        <FolderOpen className="h-3 w-3" />
                        Save to list
                      </p>
                      <div className="relative">
                        <select
                          value={selectedListId}
                          onChange={(e) => {
                            if (e.target.value === "__new__") {
                              setShowCreateList(true)
                            } else {
                              setSelectedListId(e.target.value)
                            }
                          }}
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-800 outline-none focus:border-slate-300 transition-colors cursor-pointer shadow-sm"
                        >
                          {lists.length === 0 && (
                            <option value="" disabled>No lists yet</option>
                          )}
                          {lists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                          <option value="__new__">+ Create new list</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* Alert config */}
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <p className="select-none flex items-center gap-1.5 text-xs text-slate-400">
                        <Bell className="h-3 w-3" />
                        Alert me on
                      </p>
                      <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {(["any", "percent", "fixed"] as AlertMode[]).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setAlertMode(mode)}
                            className={`px-3 py-2 text-xs font-medium transition-colors border-r border-slate-100 last:border-r-0 ${
                              alertMode === mode
                                ? "bg-slate-900 text-white"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            }`}
                          >
                            {mode === "any" ? "Any change" : mode === "percent" ? "% drop" : "$ drop"}
                          </button>
                        ))}
                        <AnimatePresence>
                          {alertMode !== "any" && (
                            <motion.input
                              key="alert-value"
                              initial={{ opacity: 0, maxWidth: 0 }}
                              animate={{ opacity: 1, maxWidth: "4rem" }}
                              exit={{ opacity: 0, maxWidth: 0 }}
                              transition={{ duration: 0.2 }}
                              type="number"
                              min={0.01}
                              step={alertMode === "percent" ? 1 : 0.01}
                              value={alertValue}
                              onChange={(e) => setAlertValue(Number(e.target.value))}
                              className="w-14 border-l border-slate-100 bg-transparent px-2 py-2 text-sm text-slate-800 text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={handleSave}
                      disabled={saving || !selectedListId}
                      className="flex h-[42px] shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      {saving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                      ) : (
                        <><Plus className="h-4 w-4" />Track Price</>
                      )}
                    </button>
                  </div>
                )}
              </GlassEffect>
            </motion.div>
          )}
        </AnimatePresence>
    </div>

    <CreateListModal
      open={showCreateList}
      onClose={() => setShowCreateList(false)}
      onCreated={(id) => {
        setSelectedListId(id)
        setShowCreateList(false)
      }}
    />
    </>
  )
}
