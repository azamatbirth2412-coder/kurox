export function AnimeCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-gray-800 animate-pulse">
      <div className="aspect-[2/3] bg-gray-700" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-700 rounded w-4/5" />
        <div className="h-3 bg-gray-700 rounded w-2/5" />
      </div>
    </div>
  );
}
