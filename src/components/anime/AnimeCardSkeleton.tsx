// Mirrors AnimeCard's text block: two title lines, then two meta lines —
// so the row doesn't reflow height when the real cards swap in.
export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="aspect-[2/3] rounded-[var(--radius)] shimmer" />
      <div className="pt-2.5 px-0.5 space-y-1.5">
        <div className="h-3.5 shimmer rounded w-11/12" />
        <div className="h-3.5 shimmer rounded w-3/5" />
        <div className="h-2.5 shimmer rounded w-4/6 mt-2.5" />
        <div className="h-2.5 shimmer rounded w-1/2" />
      </div>
    </div>
  );
}
