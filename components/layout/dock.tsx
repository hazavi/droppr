"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard,
  TrendingDown,
  FolderOpen,
  Settings,
  LogOut,
} from "lucide-react"
import { useState, useRef } from "react"
import { GlassEffect, GlassFilter } from "@/components/ui/liquid-glass"
import { useAuthContext } from "@/components/providers/auth-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals",     label: "Deals",     icon: TrendingDown },
  { href: "/lists",     label: "Lists",     icon: FolderOpen },
  { href: "/settings",  label: "Settings",  icon: Settings },
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
    <>
      {/* SVG filter — rendered once */}
      <GlassFilter />

      {/* Dock */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <GlassEffect className="rounded-3xl">
          <div className="flex items-end gap-1 px-3 py-2.5">

            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-11 h-11 mr-1"
            >
              <Image
                src="/droppr.png"
                alt="droppr"
                width={36}
                height={36}
                className="rounded-xl"
                priority
              />
            </Link>

            {/* Divider */}
            <div className="w-px h-8 bg-white/15 mx-1 self-center" />

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
                        transition={{ duration: 0.15 }}
                        className="absolute -top-9 whitespace-nowrap rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                      >
                        {item.label}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Icon pill */}
                  <motion.div
                    animate={{
                      scale: isHovered ? 1.25 : active ? 1.1 : 1,
                      y: isHovered ? -6 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                      active
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </motion.div>

                  {/* Active dot */}
                  {active && (
                    <motion.div
                      layoutId="dock-active"
                      className="mt-0.5 h-1 w-1 rounded-full bg-white/80"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  {!active && <div className="mt-0.5 h-1 w-1" />}
                </Link>
              )
            })}

            {/* Divider */}
            <div className="w-px h-8 bg-white/15 mx-1 self-center" />

            {/* User avatar / logout */}
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
                      transition={{ duration: 0.15 }}
                      className="absolute -top-9 whitespace-nowrap rounded-lg border border-white/10 bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                    >
                      {profile?.displayName ?? "Account"}
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  animate={{ scale: hovered === "user" ? 1.2 : 1, y: hovered === "user" ? -6 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white"
                >
                  {profile?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                </motion.div>
                <div className="mt-0.5 h-1 w-1" />
              </button>

              {/* Floating user menu */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-16 right-0 z-50 min-w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-1 backdrop-blur-xl"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="px-3 py-2 text-xs text-white/40">
                      {profile?.email}
                    </div>
                    <button
                      onClick={handleLogOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </GlassEffect>
      </div>
    </>
  )
}
