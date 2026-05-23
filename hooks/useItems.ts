"use client"

import { useState, useEffect } from "react"
import { subscribeToItems } from "@/lib/firestore"
import type { TrackedItem } from "@/types"

export function useItems(uid: string | null, listId: string | null) {
  const [items, setItems] = useState<TrackedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid || !listId) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToItems(uid, listId, (data) => {
      setItems(data)
      setLoading(false)
    })

    return unsubscribe
  }, [uid, listId])

  return { items, loading }
}
