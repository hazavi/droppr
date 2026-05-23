"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateItem } from "@/lib/firestore"
import { useAuthContext } from "@/components/providers/auth-provider"
import type { TrackedItem } from "@/types"

const schema = z.object({
  alertType: z.enum(["fixed", "percent"]),
  alertValue: z.number().min(0.01, "Must be greater than 0"),
})

type FormValues = z.infer<typeof schema>

interface AlertConfigModalProps {
  open: boolean
  onClose: () => void
  item: TrackedItem
  listId: string
}

export function AlertConfigModal({ open, onClose, item, listId }: AlertConfigModalProps) {
  const { user } = useAuthContext()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      alertType: item.alertType,
      alertValue: item.alertValue,
    },
  })

  const alertType = watch("alertType")

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSaving(true)
    try {
      await updateItem(user.uid, listId, item.id, {
        alertType: values.alertType,
        alertValue: values.alertValue,
      })
      toast.success("Alert rule updated")
      onClose()
    } catch {
      toast.error("Failed to update alert")
    } finally {
      setSaving(false)
    }
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
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div className="rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-100">Configure Alert</h2>
                  <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">{item.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Alert type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setValue("alertType", "percent")}
                      className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        alertType === "percent"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                          : "border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Percentage drop
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue("alertType", "fixed")}
                      className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                        alertType === "fixed"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                          : "border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      Fixed price
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-300">
                    {alertType === "percent"
                      ? "Notify when drop exceeds (%)"
                      : `Notify when price falls below (${item.currency})`}
                  </label>
                  <input
                    {...register("alertValue", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-neutral-100 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
                  />
                  {errors.alertValue && (
                    <p className="mt-1 text-xs text-red-400">{errors.alertValue.message}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-neutral-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Alert
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
