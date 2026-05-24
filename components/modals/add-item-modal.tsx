"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Link2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { addItem } from "@/lib/firestore"
import { useAuthContext } from "@/components/providers/auth-provider"
import type { ScrapeResult, ScrapeError, ItemList } from "@/types"

const schema = z.object({
  url: z.string().url("Please enter a valid URL"),
  name: z.string().min(1, "Name is required").max(200),
  listId: z.string().min(1, "Please select a list"),
  alertType: z.enum(["fixed", "percent"]),
  alertValue: z.number().min(0.01, "Must be greater than 0"),
})

type FormValues = z.infer<typeof schema>

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  lists: ItemList[]
  defaultListId?: string
}

export function AddItemModal({ open, onClose, lists, defaultListId }: AddItemModalProps) {
  const { user } = useAuthContext()
  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped] = useState<ScrapeResult | null>(null)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      alertType: "percent",
      alertValue: 10,
      listId: defaultListId ?? "",
    },
  })

  const alertType = watch("alertType")
  const urlValue = watch("url")

  async function handleScrape() {
    if (!urlValue?.startsWith("http")) {
      toast.error("Enter a valid product URL first")
      return
    }
    setScraping(true)
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scraper-secret": process.env.NEXT_PUBLIC_SCRAPER_SECRET ?? "",
        },
        body: JSON.stringify({ url: urlValue }),
      })
      const data = (await res.json()) as ScrapeResult | ScrapeError
      if ("error" in data) {
        toast.error(data.message)
        return
      }
      setScraped(data)
      setValue("name", data.name)
      toast.success("Product info fetched")
    } catch {
      toast.error("Failed to fetch product info")
    } finally {
      setScraping(false)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!user || !scraped) return
    setSaving(true)
    try {
      await addItem(user.uid, values.listId, {
        url: values.url,
        name: values.name,
        image: scraped.image,
        siteName: scraped.siteName,
        currentPrice: scraped.price,
        originalPrice: scraped.price,
        currency: scraped.currency,
        alertType: values.alertType,
        alertValue: values.alertValue,
        onSale: false,
        priceDrop: 0,
        priceDropPercent: 0,
      })
      toast.success("Item added to watchlist")
      handleClose()
    } catch {
      toast.error("Failed to add item")
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    reset()
    setScraped(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Add Item</h2>
                <button
                  onClick={handleClose}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* URL input with scrape button */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Product URL
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        {...register("url")}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleScrape}
                      disabled={scraping}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60 shadow-sm"
                    >
                      {scraping ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : scraped ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        "Fetch"
                      )}
                    </button>
                  </div>
                  {errors.url && (
                    <p className="mt-1 text-xs text-red-400">{errors.url.message}</p>
                  )}
                </div>

                {/* Scraped preview */}
                {scraped && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3"
                  >
                    {scraped.image && (
                      <img
                        src={scraped.image}
                        alt={scraped.name}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-500">
                        {scraped.siteName}
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {scraped.name}
                      </p>
                      <p className="text-xs text-green-400 font-mono">
                        {scraped.currency} {scraped.price.toFixed(2)}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Product name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Product name
                  </label>
                  <input
                    {...register("name")}
                    placeholder="Fetched automatically"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                  )}
                </div>

                {/* List selector */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Add to list
                  </label>
                  <select
                    {...register("listId")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                  >
                    <option value="">Select a list...</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  {errors.listId && (
                    <p className="mt-1 text-xs text-red-400">{errors.listId.message}</p>
                  )}
                </div>

                {/* Alert config */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Alert me when
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setValue("alertType", "percent")}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                        alertType === "percent"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      % Drop
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("alertType", "fixed")}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                        alertType === "fixed"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Fixed Price
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      {alertType === "percent" ? "%" : scraped?.currency ?? "$"}
                    </span>
                    <input
                      {...register("alertValue", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={alertType === "percent" ? "10" : "29.99"}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                    />
                  </div>
                  {errors.alertValue && (
                    <p className="mt-1 text-xs text-red-500">{errors.alertValue.message}</p>
                  )}
                  <p className="mt-1.5 text-xs text-slate-400">
                    {alertType === "percent"
                      ? "Notify when price drops by this percentage"
                      : "Notify when price drops below this amount"}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !scraped}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add to Watchlist
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
