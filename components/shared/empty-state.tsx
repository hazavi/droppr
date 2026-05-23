"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 mb-4">
        <Icon className="h-6 w-6 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-neutral-200">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-neutral-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}
