import { AnimeCardSkeleton } from "@/components/anime/AnimeCardSkeleton";

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="mb-6 space-y-2">
        <div className="h-3 w-40 shimmer rounded" />
        <div className="h-7 w-72 shimmer rounded" />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
