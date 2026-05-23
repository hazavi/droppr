export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
      <div className="aspect-square w-full bg-white/5" />
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="h-4 w-full rounded bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-white/10" />
        </div>
        <div className="mt-auto space-y-1">
          <div className="h-6 w-24 rounded bg-white/10" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
        <div className="flex justify-between border-t border-white/5 pt-3">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="h-3 w-12 rounded bg-white/10" />
        </div>
      </div>
    </div>
  )
}
