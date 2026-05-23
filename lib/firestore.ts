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
  type QueryConstraint,
  type Unsubscribe,
  writeBatch,
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
  return {
    id,
    name: (data.name as string) ?? "",
    category: (data.category as string) ?? "",
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
      const lists = snap.docs.map((d) =>
        toItemList(d.id, d.data() as Record<string, unknown>)
      )
      callback(lists)
    },
    (err) => {
      if (onError) onError(err)
      else console.error("[Firestore] subscribeToLists:", err.message)
    }
  )
}

export async function createList(
  uid: string,
  data: Pick<ItemList, "name" | "category">
): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "lists"), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
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
            query(collection(db, "users", uid, "lists", listId, "items"), orderBy("createdAt", "desc")),
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
  await batch.commit()
}

export async function moveItems(
  uid: string,
  fromListId: string,
  toListId: string,
  itemIds: string[]
): Promise<void> {
  const batch = writeBatch(db)
  for (const itemId of itemIds) {
    const snap = await getDoc(
      doc(db, "users", uid, "lists", fromListId, "items", itemId)
    )
    if (snap.exists()) {
      const newRef = doc(db, "users", uid, "lists", toListId, "items", itemId)
      batch.set(newRef, snap.data())
      batch.delete(snap.ref)
    }
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
  const allItems: TrackedItem[] = []
  await Promise.all(
    listsSnap.docs.map(async (listDoc) => {
      const itemsSnap = await getDocs(collection(db, "users", uid, "lists", listDoc.id, "items"))
      itemsSnap.docs.forEach((d) => allItems.push(toTrackedItem(d.id, d.data() as Record<string, unknown>)))
    })
  )
  return allItems
    .filter((item) => item.onSale)
    .sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime())
    .slice(0, count)
}

export async function getRecentlyAdded(
  uid: string,
  count = 6
): Promise<TrackedItem[]> {
  const listsSnap = await getDocs(collection(db, "users", uid, "lists"))
  const allItems: TrackedItem[] = []
  await Promise.all(
    listsSnap.docs.map(async (listDoc) => {
      const itemsSnap = await getDocs(collection(db, "users", uid, "lists", listDoc.id, "items"))
      itemsSnap.docs.forEach((d) => allItems.push(toTrackedItem(d.id, d.data() as Record<string, unknown>)))
    })
  )
  return allItems
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
  const items: Array<TrackedItem & { listId: string }> = []

  for (const listDoc of listsSnap.docs) {
    const itemsSnap = await getDocs(
      collection(db, "users", uid, "lists", listDoc.id, "items")
    )
    itemsSnap.docs.forEach((d) => {
      items.push({
        ...toTrackedItem(d.id, d.data() as Record<string, unknown>),
        listId: listDoc.id,
      })
    })
  }
  return items
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
