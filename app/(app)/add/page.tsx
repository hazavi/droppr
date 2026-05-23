"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { Loader2, Link2, CheckCircle, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { addItem, createList } from "@/lib/firestore"
import { CreateListModal } from "@/components/modals/create-list-modal"
import type { ScrapeResult, ScrapeError } from "@/types"

const schema = z.object({
  url: z.string().url("Please enter a valid URL"),
  name: z.string().min(1, "Name is required").max(200),
  listId: z.string().min(1, "Please select a list"),
  alertType: z.enum(["fixed", "percent"]),
  alertValue: z.number().min(0.01, "Must be greater than 0"),
})

type FormValues = z.infer<typeof schema>

export default function AddPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const { lists, loading: listsLoading } = useLists(user?.uid ?? null)
  const [scraping, setScraping] = useState(false)
  const [scraped, setScraped] = useState<ScrapeResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCreateList, setShowCreateList] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { alertType: "percent", alertValue: 10 },
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
      toast.success("Product info fetched successfully")
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
      toast.success("Item added to your watchlist")
      router.push(`/lists/${values.listId}`)
    } catch {
      toast.error("Failed to add item")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-neutral-100">Add Item</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Paste a product URL to start tracking its price
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="rounded-2xl border border-white/10 bg-[#111] p-6"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              Product URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  {...register("url")}
                  type="url"
                  placeholder="https://www.example.com/product"
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>
              <button
                type="button"
                onClick={handleScrape}
                disabled={scraping}
                className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:opacity-60 whitespace-nowrap"
              >
                {scraping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : scraped ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Re-fetch
                  </>
                ) : (
                  "Fetch Info"
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
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                {scraped.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scraped.image}
                    alt={scraped.name}
                    className="h-14 w-14 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-500">{scraped.siteName}</p>
                  <p className="text-sm font-semibold text-neutral-100 line-clamp-2">
                    {scraped.name}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-green-400">
                    {scraped.currency} {scraped.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Product name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              Product name
            </label>
            <input
              {...register("name")}
              placeholder="Auto-populated from URL"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* List selector */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-300">Add to list</label>
              <button
                type="button"
                onClick={() => setShowCreateList(true)}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                New list
              </button>
            </div>
            <select
              {...register("listId")}
              disabled={listsLoading}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2.5 text-sm text-neutral-100 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50"
            >
              <option value="">Select a list...</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {errors.listId && (
              <p className="mt-1 text-xs text-red-400">{errors.listId.message}</p>
            )}
          </div>

          {/* Alert config */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <p className="text-sm font-medium text-neutral-300">Price alert</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValue("alertType", "percent")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  alertType === "percent"
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                    : "border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                % Drop
              </button>
              <button
                type="button"
                onClick={() => setValue("alertType", "fixed")}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                  alertType === "fixed"
                    ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                    : "border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Fixed Price
              </button>
            </div>
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                  {alertType === "percent" ? "%" : (scraped?.currency ?? "$")}
                </span>
                <input
                  {...register("alertValue", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={alertType === "percent" ? "10" : "29.99"}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>
              {errors.alertValue && (
                <p className="mt-1 text-xs text-red-400">{errors.alertValue.message}</p>
              )}
              <p className="mt-1.5 text-xs text-neutral-500">
                {alertType === "percent"
                  ? "You'll be notified when the price drops by this percentage from the original"
                  : "You'll be notified when the current price falls below this amount"}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !scraped}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to Watchlist
          </button>
        </form>
      </motion.div>

      <CreateListModal
        open={showCreateList}
        onClose={() => setShowCreateList(false)}
        onCreated={(id) => setValue("listId", id)}
      />
    </div>
  )
}
