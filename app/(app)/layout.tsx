"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/components/providers/auth-provider"
import { Dock } from "@/components/layout/dock"

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/20" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), " +
          "radial-gradient(ellipse at 80% 20%, rgba(168,85,247,0.12) 0%, transparent 55%), " +
          "radial-gradient(ellipse at 60% 80%, rgba(59,130,246,0.1) 0%, transparent 50%), " +
          "#0a0a0a",
      }}
    >
      {/* Subtle animated orbs */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div
          className="absolute left-[15%] top-[20%] h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.6), transparent 70%)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute right-[15%] top-[55%] h-72 w-72 rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.6), transparent 70%)",
            animation: "float 11s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute left-[55%] bottom-[20%] h-64 w-64 rounded-full opacity-10 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(59,130,246,0.7), transparent 70%)",
            animation: "float 9s ease-in-out infinite 2s",
          }}
        />
      </div>

      {/* Page content */}
      <main className="relative z-10 min-h-screen overflow-y-auto px-4 pb-32 pt-8 lg:px-10">
        {children}
      </main>

      {/* Bottom dock */}
      <Dock />
    </div>
  )
}

