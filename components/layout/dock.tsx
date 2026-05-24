"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  House,
  TrendingDown,
  FolderOpen,
  SlidersHorizontal,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import { useAuthContext } from "@/components/providers/auth-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Home",     icon: House },
  { href: "/deals",     label: "Deals",    icon: TrendingDown },
  { href: "/lists",     label: "Lists",    icon: FolderOpen },
  { href: "/settings",  label: "Settings", icon: SlidersHorizontal },
]

export function Dock() {
  const pathname = usePathname()
  const { logOut, profile } = useAuthContext()
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  async function handleLogOut() {
    try {
      await logOut()
      router.replace("/login")
    } catch {
      toast.error("Failed to sign out")
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        className="flex items-end gap-0.5 rounded-3xl px-3 py-2.5"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)",
          border: "1px solid rgba(255,255,255,0.85)",
        }}
      >
        {/* Nav icons */}
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          const isHovered = hovered === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              onMouseLeave={() => setHovered(null)}
              className="relative flex flex-col items-center"
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
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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

        {/* Divider */}
        <div className="mx-1.5 h-8 w-px self-center bg-slate-200" />

        {/* User avatar */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            onMouseEnter={() => setHovered("user")}
            onMouseLeave={() => setHovered(null)}
            className="relative flex flex-col items-center"
          >
            <AnimatePresence>
              {hovered === "user" && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  className="absolute -top-9 whitespace-nowrap rounded-lg bg-gray-900/90 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {profile?.displayName ?? "Account"}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              animate={{ scale: hovered === "user" ? 1.18 : 1, y: hovered === "user" ? -5 : 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm"
            >
              {profile?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </motion.div>
            <div className="mt-1 h-1 w-1" />
          </button>

          {/* Floating user menu */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-16 right-0 z-50 min-w-[190px] overflow-hidden rounded-2xl p-1"
                style={{
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1)",
                  border: "1px solid rgba(255,255,255,0.8)",
                }}
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className="px-3 py-2 text-xs text-slate-400">
                  {profile?.email}
                </div>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={handleLogOut}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
