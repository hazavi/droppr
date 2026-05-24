import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  writeBatch,
  increment,
  getCountFromServer,
} from "firebase/firestore"
import { db } from "./firebase"
import type { TrackedItem, ItemList, UserProfile, PricePoint } from "@/types"

// ─── Converters ──────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return new Date()
}

function toTrackedItem(id: string, data: Record<string, unknown>): TrackedItem {
  return {
    id,
    url: (data.url as string) ?? "",
    name: (data.name as string) ?? "",
    image: (data.image as string) ?? "",
    siteName: (data.siteName as string) ?? "",
    currentPrice: (data.currentPrice as number) ?? 0,
    originalPrice: (data.originalPrice as number) ?? 0,
    currency: (data.currency as string) ?? "USD",
    alertType: (data.alertType as "fixed" | "percent") ?? "percent",
    alertValue: (data.alertValue as number) ?? 10,
    onSale: (data.onSale as boolean) ?? false,
    priceDrop: (data.priceDrop as number) ?? 0,
    priceDropPercent: (data.priceDropPercent as number) ?? 0,
    lastChecked: toDate(data.lastChecked),
    createdAt: toDate(data.createdAt),
  }
}

function toItemList(id: string, data: Record<string, unknown>): ItemList {
  // Backward-compat: old records stored `emoji` directly
  const icon = ((data.icon ?? data.emoji) as string) || undefined
  const iconType: ItemList["iconType"] = data.iconType
    ? (data.iconType as "emoji" | "icon")
    : data.emoji
    ? "emoji"
    : undefined
  return {
    id,
    name: (data.name as string) ?? "",
    category: (data.category as string) ?? "",
    icon,
    iconType,
    order: (data.order as number) ?? undefined,
    createdAt: toDate(data.createdAt),
    itemCount: (data.itemCount as number) ?? 0,
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function createUserProfile(
  uid: string,
  profile: Omit<UserProfile, "uid">
): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    ...profile,
    createdAt: serverTimestamp(),
  })
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  const data = snap.data() as Record<string, unknown>
  return {
    uid,
    email: (data.email as string) ?? "",
    displayName: (data.displayName as string) ?? "",
    notifyVia: "email",
    emailNotificationsEnabled: (data.emailNotificationsEnabled as boolean) ?? true,
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, "uid">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), updates)
}

// ─── Lists ────────────────────────────────────────────────────────────────────

export function subscribeToLists(
  uid: string,
  callback: (lists: ItemList[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "users", uid, "lists"),
    orderBy("createdAt", "desc")
  )
  return onSnapshot(
    q,
    (snap) => {
      // Fetch real item count from each list's items subcollection
      Promise.all(
        snap.docs.map(async (d) => {
          const list = toItemList(d.id, d.data() as Record<string, unknown>)
          const countSnap = await getCountFromServer(
            collection(db, "users", uid, "lists", d.id, "items")
          )
          list.itemCount = countSnap.data().count
          return list
        })
      )
        .then((unsorted) => {
          // Sort by explicit order field; fall back to createdAt desc for old records
          const sorted = [...unsorted].sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) return a.order - b.order
            if (a.order !== undefined) return -1
            if (b.order !== undefined) return 1
            return b.createdAt.getTime() - a.createdAt.getTime()
          })
          callback(sorted)
        })
        .catch((err: Error) => {
          if (onError) onError(err)
          else console.error("[Firestore] subscribeToLists (count):", err.message)
        })
    },
    (err) => {
      if (onError) onError(err)
      else console.error("[Firestore] subscribeToLists:", err.message)
    }
  )
}

export async function createList(
  uid: string,
  data: Pick<ItemList, "name" | "category" | "icon" | "iconType">
): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "lists"), {
    ...data,
    order: Date.now(),
    itemCount: 0,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
export async function updateList(
  uid: string,
  listId: string,
  updates: Partial<Pick<ItemList, "name" | "category" | "icon" | "iconType">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "lists", listId), updates)
}

export async function reorderLists(
  uid: string,
  updates: { id: string; order: number }[]
): Promise<void> {
  const batch = writeBatch(db)
  updates.forEach(({ id, order }) => {
    batch.update(doc(db, "users", uid, "lists", id), { order })
  })
  await batch.commit()
}

export async function deleteList(uid: string, listId: string): Promise<void> {
  // Delete all items first
  const itemsSnap = await getDocs(
    collection(db, "users", uid, "lists", listId, "items")
  )
  const batch = writeBatch(db)
  itemsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, "users", uid, "lists", listId))
  await batch.commit()
}

export async function getList(uid: string, listId: string): Promise<ItemList | null> {
  const snap = await getDoc(doc(db, "users", uid, "lists", listId))
  if (!snap.exists()) return null
  return toItemList(snap.id, snap.data() as Record<string, unknown>)
}

// ─── Items ────────────────────────────────────────────────────────────────────

export function subscribeToItems(
  uid: string,
  listId: string,
  callback: (items: TrackedItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, "users", uid, "lists", listId, "items"),
    orderBy("createdAt", "desc")
  )
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) =>
        toTrackedItem(d.id, d.data() as Record<string, unknown>)
      )
      callback(items)
    },
    (err) => {
      if (onError) onError(err)
      else console.error("[Firestore] subscribeToItems:", err.message)
    }
  )
}

export function subscribeToAllItems(
  uid: string,
  callback: (items: TrackedItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const itemsByList: Record<string, TrackedItem[]> = {}
  const itemUnsubs: Record<string, Unsubscribe> = {}

  function emit() {
    const all = Object.values(itemsByList)
      .flat()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    callback(all)
  }

  const unsubLists = onSnapshot(
    collection(db, "users", uid, "lists"),
    (listsSnap) => {
      const currentIds = new Set(listsSnap.docs.map((d) => d.id))
      for (const id of Object.keys(itemUnsubs)) {
        if (!currentIds.has(id)) {
          itemUnsubs[id]()
          delete itemUnsubs[id]
          delete itemsByList[id]
        }
      }
      for (const listDoc of listsSnap.docs) {
        if (!itemUnsubs[listDoc.id]) {
          const listId = listDoc.id
          itemsByList[listId] = []
          itemUnsubs[listId] = onSnapshot(
            query(collection(db, "users", uid, "lists", listId, "items"), orderBy("createdAt", "desc")),
            (snap) => {
              itemsByList[listId] = snap.docs.map((d) => toTrackedItem(d.id, d.data() as Record<string, unknown>))
              emit()
            },
            (err) => { if (onError) onError(err); else console.error("[Firestore] subscribeToAllItems items:", err.message) }
          )
        }
      }
      emit()
    },
    (err) => { if (onError) onError(err); else console.error("[Firestore] subscribeToAllItems lists:", err.message) }
  )

  return () => {
    unsubLists()
    Object.values(itemUnsubs).forEach((u) => u())
  }
}

export function subscribeToDeals(
  uid: string,
  callback: (items: TrackedItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const itemsByList: Record<string, TrackedItem[]> = {}
  const itemUnsubs: Record<string, Unsubscribe> = {}

  function emit() {
    const deals = Object.values(itemsByList)
      .flat()
      .filter((item) => item.onSale)
      .sort((a, b) => b.priceDropPercent - a.priceDropPercent)
    callback(deals)
  }

  const unsubLists = onSnapshot(
    collection(db, "users", uid, "lists"),
    (listsSnap) => {
      const currentIds = new Set(listsSnap.docs.map((d) => d.id))
      for (const id of Object.keys(itemUnsubs)) {
        if (!currentIds.has(id)) {
          itemUnsubs[id]()
          delete itemUnsubs[id]
          delete itemsByList[id]
        }
      }
      for (const listDoc of listsSnap.docs) {
        if (!itemUnsubs[listDoc.id]) {
          const listId = listDoc.id
          itemsByList[listId] = []
          itemUnsubs[listId] = onSnapshot(
            query(
              collection(db, "users", uid, "lists", listId, "items"),
              where("onSale", "==", true)
            ),
            (snap) => {
              itemsByList[listId] = snap.docs.map((d) => toTrackedItem(d.id, d.data() as Record<string, unknown>))
              emit()
            },
            (err) => { if (onError) onError(err); else console.error("[Firestore] subscribeToDeals items:", err.message) }
          )
        }
      }
      emit()
    },
    (err) => { if (onError) onError(err); else console.error("[Firestore] subscribeToDeals lists:", err.message) }
  )

  return () => {
    unsubLists()
    Object.values(itemUnsubs).forEach((u) => u())
  }
}

export async function addItem(
  uid: string,
  listId: string,
  item: Omit<TrackedItem, "id" | "createdAt" | "lastChecked">
): Promise<string> {
  const ref = await addDoc(
    collection(db, "users", uid, "lists", listId, "items"),
    {
      ...item,
      userId: uid,
      createdAt: serverTimestamp(),
      lastChecked: serverTimestamp(),
    }
  )
  await updateDoc(doc(db, "users", uid, "lists", listId), {
    itemCount: increment(1),
  })
  return ref.id
}

export async function updateItem(
  uid: string,
  listId: string,
  itemId: string,
  updates: Partial<TrackedItem>
): Promise<void> {
  await updateDoc(
    doc(db, "users", uid, "lists", listId, "items", itemId),
    updates
  )
}

export async function deleteItem(
  uid: string,
  listId: string,
  itemId: string
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "lists", listId, "items", itemId))
  await updateDoc(doc(db, "users", uid, "lists", listId), {
    itemCount: increment(-1),
  })
}

export async function deleteItems(
  uid: string,
  listId: string,
  itemIds: string[]
): Promise<void> {
  const batch = writeBatch(db)
  itemIds.forEach((id) =>
    batch.delete(doc(db, "users", uid, "lists", listId, "items", id))
  )
  batch.update(doc(db, "users", uid, "lists", listId), {
    itemCount: increment(-itemIds.length),
  })
  await batch.commit()
}

export async function moveItems(
  uid: string,
  fromListId: string,
  toListId: string,
  itemIds: string[]
): Promise<void> {
  const batch = writeBatch(db)
  let moved = 0
  for (const itemId of itemIds) {
    const snap = await getDoc(
      doc(db, "users", uid, "lists", fromListId, "items", itemId)
    )
    if (snap.exists()) {
      const newRef = doc(db, "users", uid, "lists", toListId, "items", itemId)
      batch.set(newRef, snap.data())
      batch.delete(snap.ref)
      moved++
    }
  }
  if (moved > 0) {
    batch.update(doc(db, "users", uid, "lists", fromListId), { itemCount: increment(-moved) })
    batch.update(doc(db, "users", uid, "lists", toListId), { itemCount: increment(moved) })
  }
  await batch.commit()
}

// ─── Price History ────────────────────────────────────────────────────────────

export async function addPriceHistoryEntry(
  uid: string,
  listId: string,
  itemId: string,
  price: number
): Promise<void> {
  await addDoc(
    collection(
      db,
      "users",
      uid,
      "lists",
      listId,
      "items",
      itemId,
      "priceHistory"
    ),
    {
      price,
      recordedAt: serverTimestamp(),
    }
  )
}

export async function getPriceHistory(
  uid: string,
  listId: string,
  itemId: string
): Promise<PricePoint[]> {
  const q = query(
    collection(
      db,
      "users",
      uid,
      "lists",
      listId,
      "items",
      itemId,
      "priceHistory"
    ),
    orderBy("recordedAt", "asc"),
    limit(90)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    return {
      id: d.id,
      price: (data.price as number) ?? 0,
      recordedAt: toDate(data.recordedAt),
    }
  })
}

// ─── Dashboard helpers ────────────────────────────────────────────────────────

export async function getRecentlyDropped(
  uid: string,
  count = 6
): Promise<TrackedItem[]> {
  const listsSnap = await getDocs(collection(db, "users", uid, "lists"))
  const perList = await Promise.all(
    listsSnap.docs.map((listDoc) =>
      getDocs(
        query(
          collection(db, "users", uid, "lists", listDoc.id, "items"),
          where("onSale", "==", true)
        )
      )
    )
  )
  return perList
    .flatMap((snap) => snap.docs.map((d) => toTrackedItem(d.id, d.data() as Record<string, unknown>)))
    .sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime())
    .slice(0, count)
}

export async function getRecentlyAdded(
  uid: string,
  count = 6
): Promise<TrackedItem[]> {
  const listsSnap = await getDocs(collection(db, "users", uid, "lists"))
  const perList = await Promise.all(
    listsSnap.docs.map((listDoc) =>
      getDocs(
        query(
          collection(db, "users", uid, "lists", listDoc.id, "items"),
          orderBy("createdAt", "desc"),
          limit(count)
        )
      )
    )
  )
  return perList
    .flatMap((snap) => snap.docs.map((d) => toTrackedItem(d.id, d.data() as Record<string, unknown>)))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, count)
}

// ─── Server-side (cron) helpers ───────────────────────────────────────────────

export async function getAllUsersServer(): Promise<Array<{ uid: string; email: string; emailNotificationsEnabled: boolean }>> {
  const snap = await getDocs(collection(db, "users"))
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>
    return {
      uid: d.id,
      email: (data.email as string) ?? "",
      emailNotificationsEnabled: (data.emailNotificationsEnabled as boolean) ?? false,
    }
  })
}

export async function getAllItemsForUser(
  uid: string
): Promise<Array<TrackedItem & { listId: string }>> {
  const listsSnap = await getDocs(collection(db, "users", uid, "lists"))
  const perList = await Promise.all(
    listsSnap.docs.map(async (listDoc) => {
      const snap = await getDocs(
        collection(db, "users", uid, "lists", listDoc.id, "items")
      )
      return snap.docs.map((d) => ({
        ...toTrackedItem(d.id, d.data() as Record<string, unknown>),
        listId: listDoc.id,
      }))
    })
  )
  return perList.flat()
}

export async function updateItemPrice(
  uid: string,
  listId: string,
  itemId: string,
  newPrice: number,
  originalPrice: number
): Promise<void> {
  const priceDrop = Math.max(0, originalPrice - newPrice)
  const priceDropPercent =
    originalPrice > 0
      ? Math.round((priceDrop / originalPrice) * 100 * 10) / 10
      : 0
  const onSale = newPrice < originalPrice

  await updateDoc(doc(db, "users", uid, "lists", listId, "items", itemId), {
    currentPrice: newPrice,
    priceDrop,
    priceDropPercent,
    onSale,
    lastChecked: serverTimestamp(),
  })

  await addPriceHistoryEntry(uid, listId, itemId, newPrice)
}
