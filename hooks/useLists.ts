"use client"

import { useState, useEffect } from "react"
import { subscribeToLists } from "@/lib/firestore"
import type { ItemList } from "@/types"

export function useLists(uid: string | null) {
  const [lists, setLists] = useState<ItemList[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setLists([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToLists(uid, (data) => {
      setLists(data)
      setLoading(false)
    })

    return unsubscribe
  }, [uid])

  return { lists, loading }
}
