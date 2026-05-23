"use client"

import { PlusCircle, Menu, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "./sidebar"

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a]/80 px-4 backdrop-blur-sm lg:px-6">
        {/* Mobile menu button */}
        <button
          className="flex items-center gap-2 rounded-md p-2 text-neutral-400 hover:bg-white/5 hover:text-neutral-200 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <p className="hidden text-sm font-semibold text-neutral-300 lg:block">
          {title ?? ""}
        </p>

        <Link
          href="/add"
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <PlusCircle className="h-4 w-4" />
          Add Item
        </Link>
      </header>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="fixed left-0 top-0 z-50 h-full lg:hidden"
            >
              <div className="relative h-full">
                <button
                  className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-neutral-400 hover:bg-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
                <Sidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
