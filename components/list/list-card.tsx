"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, MoreHorizontal, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ItemList } from "@/types"
import { cn, toSlug } from "@/lib/utils"
import { ListIconDisplay } from "@/components/list/list-icon-map"
import { EditListModal } from "@/components/modals/edit-list-modal"

interface ListCardProps {
  list: ItemList
}

export function ListCard({ list }: ListCardProps) {
  const [editOpen, setEditOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/row bg-transparent",
        isDragging && "z-20 shadow-lg opacity-90 bg-white",
      )}
    >
      {/* Drag handle — left edge, visible on hover */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 p-1 opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Main row link */}
      <Link
        href={`/lists/${toSlug(list.name)}`}
        className="flex items-center gap-4 pl-8 pr-5 py-4 transition-colors hover:bg-slate-50/80"
      >
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <ListIconDisplay list={list} className="h-5 w-5 text-slate-500" />
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{list.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {list.category}
            <span className="mx-1.5 text-slate-200">·</span>
            {list.itemCount ?? 0} {(list.itemCount ?? 0) === 1 ? "item" : "items"}
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-slate-400" />
      </Link>

      {/* Edit button — fades in on hover, sits over the chevron */}
      <button
        onClick={() => setEditOpen(true)}
        aria-label="Edit list"
        className="absolute right-10 top-1/2 z-10 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-400 shadow-sm opacity-0 transition-all group-hover/row:opacity-100 hover:text-slate-700"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      <EditListModal open={editOpen} onClose={() => setEditOpen(false)} list={list} />
    </div>
  )
}



