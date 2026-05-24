"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createList } from "@/lib/firestore"
import { useAuthContext } from "@/components/providers/auth-provider"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category: z.string().min(1, "Category is required").max(50),
})

type FormValues = z.infer<typeof schema>

const PRESET_CATEGORIES = [
  "Clothing",
  "Electronics",
  "Skincare",
  "Shoes",
  "Home",
  "Books",
  "Accessories",
  "Other",
]

interface CreateListModalProps {
  open: boolean
  onClose: () => void
  onCreated?: (listId: string) => void
}

export function CreateListModal({ open, onClose, onCreated }: CreateListModalProps) {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const selectedCategory = watch("category")

  async function onSubmit(values: FormValues) {
    if (!user) return
    setLoading(true)
    try {
      const id = await createList(user.uid, values)
      toast.success(`List "${values.name}" created`)
      reset()
      onCreated?.(id)
      onClose()
    } catch {
      toast.error("Failed to create list")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    reset()
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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">New List</h2>
                <button
                  onClick={handleClose}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    List name
                  </label>
                  <input
                    {...register("name")}
                    placeholder="e.g. Summer wardrobe"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setValue("category", cat)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          selectedCategory === cat
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <input
                    {...register("category")}
                    placeholder="Or type a custom category"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                  />
                  {errors.category && (
                    <p className="mt-1 text-xs text-red-400">{errors.category.message}</p>
                  )}
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
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create List
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
