"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  House,
  TrendingDown,
  FolderOpen,
  SlidersHorizontal,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Home",     icon: House },
  { href: "/deals",     label: "Deals",    icon: TrendingDown },
  { href: "/lists",     label: "Lists",    icon: FolderOpen },
  { href: "/settings",  label: "Settings", icon: SlidersHorizontal },
]

export function Dock() {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      {/* Dock outer — allows tooltip overflow; glass layers clipped inside */}
      <div
        className="relative flex items-end gap-0.5 px-3 py-2.5"
        style={{
          boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          borderRadius: "24px",
        }}
      >
        {/* ── Glass Layers ──────────────────────────────────────── */}
        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "24px", zIndex: 0 }}>
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: "blur(20px) saturate(220%)",
              WebkitBackdropFilter: "blur(20px) saturate(220%)",
              filter: "url(#glass-distortion)",
              isolation: "isolate",
              borderRadius: "inherit",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "rgba(255,255,255,0.60)", borderRadius: "inherit" }}
          />
          <div
            className="absolute inset-0"
            style={{
              boxShadow: "inset 2px 2px 1px 0 rgba(255,255,255,0.85), inset -1px -1px 1px 1px rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.85)",
              borderRadius: "inherit",
            }}
          />
        </div>
        {/* ── Nav Items ─────────────────────────────────────────── */}
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          const isHovered = hovered === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Tooltip */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    className="absolute -top-9 whitespace-nowrap rounded-lg bg-gray-900/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                animate={{
                  scale: isHovered ? 1.22 : active ? 1.08 : 1,
                  y: isHovered ? -5 : 0,
                }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-150",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              </motion.div>

              {/* Active dot */}
              <div className="mt-1 h-1 w-1">
                {active && (
                  <motion.div
                    layoutId="dock-active"
                    className="h-1 w-1 rounded-full bg-slate-800"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
            </Link>
          )
        })}

      </div>
    </div>
  )
}
