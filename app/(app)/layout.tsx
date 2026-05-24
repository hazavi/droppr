"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/components/providers/auth-provider"
import { Dock } from "@/components/layout/dock"
import { GlassFilter } from "@/components/ui/liquid-glass"

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
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen bg-zinc-50">
      {/* Single SVG filter for liquid glass — referenced by all GlassEffect components */}
      <GlassFilter />
      {/* Aurora background layer */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className={[
            "absolute -inset-[10px] opacity-40 will-change-transform",
            "[--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]",
            "[--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]",
            "[background-image:var(--white-gradient),var(--aurora)]",
            "[background-size:300%,_200%]",
            "[background-position:50%_50%,50%_50%]",
            "filter blur-[10px] invert",
            "after:content-[''] after:absolute after:inset-0",
            "after:[background-image:var(--white-gradient),var(--aurora)]",
            "after:[background-size:200%,_100%]",
            "after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference",
            "[mask-image:radial-gradient(ellipse_at_80%_0%,black_10%,transparent_70%)]",
          ].join(" ")}
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

