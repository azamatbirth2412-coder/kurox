import { AnimeCardSkeleton } from "@/components/anime/AnimeCardSkeleton";

export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="mb-6 space-y-2">
        <div className="h-3 w-32 shimmer rounded" />
        <div className="h-7 w-52 shimmer rounded" />
      </div>
      <div className="h-12 max-w-xl shimmer rounded-2xl mb-8" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
