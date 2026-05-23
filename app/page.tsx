"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/components/providers/auth-provider"

export default function Home() {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace("/dashboard")
    } else {
      router.replace("/login")
    }
  }, [user, loading, router])

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="h-8 w-8 animate-pulse rounded-full bg-indigo-500/30" />
    </div>
  )
}


