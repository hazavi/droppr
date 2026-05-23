"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  TrendingDown,
  FolderOpen,
  PlusCircle,
  Settings,
  LogOut,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthContext } from "@/components/providers/auth-provider"
import { toast } from "sonner"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Deals", icon: TrendingDown },
  { href: "/lists", label: "Lists", icon: FolderOpen },
  { href: "/add", label: "Add Item", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { logOut, profile } = useAuthContext()

  async function handleLogOut() {
    try {
      await logOut()
    } catch {
      toast.error("Failed to sign out")
    }
  }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-white/10 bg-[#111] px-4 py-6">
      {/* Logo */}
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold tracking-tight text-neutral-100">
          droppr
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-indicator"
                  className="absolute inset-0 rounded-lg bg-indigo-500/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className="relative h-4 w-4 shrink-0" />
              <span className="relative">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="mt-auto border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300">
            {profile?.displayName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-neutral-300">
              {profile?.displayName ?? "User"}
            </p>
            <p className="truncate text-[10px] text-neutral-500">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogOut}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-300"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
