export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square w-full bg-slate-100" />
      <div className="flex flex-col gap-3 p-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-3/4 rounded bg-slate-200" />
        </div>
        <div className="mt-auto space-y-1">
          <div className="h-6 w-24 rounded bg-slate-200" />
          <div className="h-3 w-16 rounded bg-slate-200" />
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3">
          <div className="h-3 w-16 rounded bg-slate-200" />
          <div className="h-3 w-12 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
