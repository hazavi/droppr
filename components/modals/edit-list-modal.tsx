"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { updateList, deleteList } from "@/lib/firestore"
import { useAuthContext } from "@/components/providers/auth-provider"
import { LIST_ICONS } from "@/components/list/list-icon-map"
import type { ItemList } from "@/types"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category: z.string().min(1, "Category is required").max(50),
  icon: z.string().optional(),
  iconType: z.enum(["emoji", "icon"]).optional(),
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

const PRESET_EMOJIS = [
  "👗", "👟", "👜", "🧥", "🕶️", "👑",
  "💻", "📱", "🎮", "🎧", "📷", "⌚",
  "💄", "🧴", "💅", "🌿", "✨", "💎",
  "🏠", "📚", "☕", "🏋️", "✈️", "🎁",
]

interface EditListModalProps {
  open: boolean
  onClose: () => void
  list: ItemList
}

export function EditListModal({ open, onClose, list }: EditListModalProps) {
  const { user } = useAuthContext()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [iconTab, setIconTab] = useState<"icon" | "emoji">("icon")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const selectedCategory = watch("category")
  const selectedIcon = watch("icon")
  const selectedIconType = watch("iconType")

  // Populate form when modal opens / list changes
  useEffect(() => {
    if (open) {
      reset({
        name: list.name,
        category: list.category,
        icon: list.icon,
        iconType: list.iconType,
      })
      setIconTab(list.iconType === "emoji" ? "emoji" : "icon")
      setConfirmDelete(false)
    }
  }, [open, list, reset])

  async function onSubmit(values: FormValues) {
    if (!user) return
    setSaving(true)
    try {
      await updateList(user.uid, list.id, {
        name: values.name,
        category: values.category,
        icon: values.icon,
        iconType: values.iconType,
      })
      toast.success("List updated")
      onClose()
    } catch {
      toast.error("Failed to update list")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    if (!user) return
    setDeleting(true)
    try {
      await deleteList(user.uid, list.id)
      toast.success(`"${list.name}" deleted`)
      onClose()
    } catch {
      toast.error("Failed to delete list")
    } finally {
      setDeleting(false)
    }
  }

  function handleClose() {
    setConfirmDelete(false)
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
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Edit List</h2>
                <button
                  onClick={handleClose}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    List name
                  </label>
                  <input
                    {...register("name")}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/40 shadow-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                  )}
                </div>

                {/* Icon picker */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Icon
                  </label>
                  <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setIconTab("icon")}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                        iconTab === "icon"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Icons
                    </button>
                    <button
                      type="button"
                      onClick={() => setIconTab("emoji")}
                      className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${
                        iconTab === "emoji"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Emoji
                    </button>
                  </div>

                  {iconTab === "icon" ? (
                    <div className="grid grid-cols-8 gap-1.5">
                      {LIST_ICONS.map(({ name, Icon }) => (
                        <button
                          key={name}
                          type="button"
                          title={name}
                          onClick={() => {
                            if (selectedIcon === name && selectedIconType === "icon") {
                              setValue("icon", undefined)
                              setValue("iconType", undefined)
                            } else {
                              setValue("icon", name)
                              setValue("iconType", "icon")
                            }
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                            selectedIcon === name && selectedIconType === "icon"
                              ? "bg-indigo-100 ring-2 ring-indigo-400 scale-110"
                              : "bg-slate-100 hover:bg-slate-200"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              selectedIcon === name && selectedIconType === "icon"
                                ? "text-indigo-600"
                                : "text-slate-500"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-8 gap-1.5">
                      {PRESET_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            if (selectedIcon === emoji && selectedIconType === "emoji") {
                              setValue("icon", undefined)
                              setValue("iconType", undefined)
                            } else {
                              setValue("icon", emoji)
                              setValue("iconType", "emoji")
                            }
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                            selectedIcon === emoji && selectedIconType === "emoji"
                              ? "bg-indigo-100 ring-2 ring-indigo-400 scale-110"
                              : "bg-slate-100 hover:bg-slate-200"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category */}
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

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      confirmDelete
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    } disabled:opacity-60`}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {confirmDelete ? "Confirm delete" : "Delete"}
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save changes
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
