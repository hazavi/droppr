"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FolderOpen, Plus } from "lucide-react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLists } from "@/hooks/useLists"
import { ListGrid } from "@/components/list/list-grid"
import { CreateListModal } from "@/components/modals/create-list-modal"
import { EmptyState } from "@/components/shared/empty-state"

export default function ListsPage() {
  const { user } = useAuthContext()
  const { lists, loading } = useLists(user?.uid ?? null)
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Lists</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Organize your tracked items into lists
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New List
        </button>
      </motion.div>

      <ListGrid
        lists={lists}
        loading={loading}
        emptyState={
          <EmptyState
            icon={FolderOpen}
            title="No lists yet"
            description="Create a list to start organizing your tracked items."
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
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
      />
    </div>
  )
}
