"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/components/providers/auth-provider"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

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
        <div className="h-8 w-8 animate-pulse rounded-full bg-indigo-500/30" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
