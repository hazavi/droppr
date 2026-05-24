"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { ListCard } from "./list-card"
import type { ItemList } from "@/types"

const SKELETON_KEYS = Array.from({ length: 4 }, (_, i) => i)

function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-36 rounded bg-slate-200" />
        <div className="h-3 w-20 rounded bg-slate-100" />
      </div>
      <div className="h-3 w-10 rounded bg-slate-100" />
    </div>
  )
}

interface ListGridProps {
  lists: ItemList[]
  loading?: boolean
  emptyState?: React.ReactNode
  onReorder?: (lists: ItemList[]) => void
}

export function ListGrid({ lists, loading, emptyState, onReorder }: ListGridProps) {
  const [ordered, setOrdered] = useState(lists)

  // Keep in sync when Firestore pushes updates
  useEffect(() => {
    setOrdered(lists)
  }, [lists])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setOrdered((prev) => {
        const oldIndex = prev.findIndex((l) => l.id === active.id)
        const newIndex = prev.findIndex((l) => l.id === over.id)
        const reordered = arrayMove(prev, oldIndex, newIndex)
        onReorder?.(reordered)
        return reordered
      })
    }
  }

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-md divide-y divide-slate-100 animate-pulse">
        {SKELETON_KEYS.map((i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (ordered.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-md divide-y divide-slate-100">
          {ordered.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}


