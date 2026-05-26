"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-3 pb-28 pt-2 text-xs text-slate-400">
        <Image src="/droppr.png" alt="droppr" width={16} height={16} className="opacity-60" />
        <span className="font-medium text-slate-500">droppr</span>
        <span className="text-slate-300">·</span>
        <span>© {new Date().getFullYear()}</span>
        <span className="text-slate-300">·</span>
        <a
          href="https://github.com/hazavi/droppr"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 transition-colors hover:text-slate-700"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.185 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.338 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.203 22 16.447 22 12.021 22 6.484 17.523 2 12 2z" />
          </svg>
          hazavi/droppr
        </a>
      </footer>

      {/* Bottom dock */}
      <Dock />
    </div>
  )
}

