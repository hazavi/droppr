"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FolderOpen, Plus } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { ListGrid } from "@/components/list/list-grid"
import { CreateListModal } from "@/components/modals/create-list-modal"
import { EmptyState } from "@/components/shared/empty-state"
import { reorderLists } from "@/lib/firestore"
import type { ItemList } from "@/types"

export default function ListsPage() {
  const { user } = useAuthContext()
  const router = useRouter()
  const { lists, loading } = useLists(user?.uid ?? null)
  const [showCreate, setShowCreate] = useState(false)

  async function handleReorder(newLists: ItemList[]) {
    if (!user) return
    await reorderLists(user.uid, newLists.map((l, i) => ({ id: l.id, order: i })))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lists</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize your tracked items into lists
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New List
        </button>
      </motion.div>

      <ListGrid
        lists={lists}
        loading={loading}
        onReorder={handleReorder}
        emptyState={
          <EmptyState
            icon={FolderOpen}
            title="No lists yet"
            description="Create a list to start organizing your tracked items."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first list
              </button>
            }
          />
        }
      />

      <CreateListModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => router.push("/home")}
      />
    </div>
  )
}
