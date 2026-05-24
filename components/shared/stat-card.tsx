"use client"

import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { GlassPanel } from "@/components/ui/liquid-glass"

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
}

const variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function StatCard({ label, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <motion.div variants={variants} initial="hidden" animate="visible">
      <GlassPanel className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-white/50">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
            {trend && (
              <p className={`mt-1 text-xs font-medium ${trendUp ? "text-green-400" : "text-red-400"}`}>
                {trend}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Icon className="h-5 w-5 text-white/80" />
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
