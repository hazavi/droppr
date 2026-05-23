"use client"

import { useState, useEffect } from "react"
import { subscribeToDeals } from "@/lib/firestore"
import type { TrackedItem } from "@/types"

export function useDeals(uid: string | null) {
  const [deals, setDeals] = useState<TrackedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setDeals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToDeals(uid, (data) => {
      setDeals(data)
      setLoading(false)
    })

    return unsubscribe
  }, [uid])

  return { deals, loading }
}
