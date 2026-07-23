export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[2/3] rounded-[var(--radius)] shimmer" />
      <div className="space-y-1.5 px-0.5">
        <div className="h-3.5 shimmer rounded w-5/6" />
        <div className="h-3 shimmer rounded w-4/6" />
        <div className="h-3 shimmer rounded w-2/6" />
      </div>
    </div>
  );
}
