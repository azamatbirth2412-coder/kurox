import Link from "next/link";
import Image from "next/image";
import { Star, Eye } from "lucide-react";

interface AnimeCardProps {
  id: string;
  slug: string;
  title: string;
  poster?: string | null;
  year?: number | null;
  type?: string;
  rating?: number | null;
  viewsCount?: number;
  genres?: string[];
}

export function AnimeCard({
  id,
  slug,
  title,
  poster,
  year,
  type,
  rating,
  viewsCount,
}: AnimeCardProps) {
  return (
    <Link
      href={`/anime/${slug}-${id}`}
      className="group relative block rounded-xl overflow-hidden bg-gray-800 hover:scale-105 transition-transform duration-200"
    >
      <div className="aspect-[2/3] relative">
        {poster ? (
          <Image
            src={poster}
            alt={`${title} — смотреть аниме онлайн`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 text-sm">
            Нет постера
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {rating !== null && rating !== undefined && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 rounded-md px-1.5 py-0.5 text-xs font-medium text-yellow-400">
            <Star size={10} fill="currentColor" /> {rating.toFixed(1)}
          </div>
        )}
        {type && (
          <div className="absolute top-2 right-2 bg-purple-600/90 rounded-md px-1.5 py-0.5 text-xs font-medium">
            {type}
          </div>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug">{title}</h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          {year && <span>{year}</span>}
          {viewsCount !== undefined && (
            <span className="flex items-center gap-0.5">
              <Eye size={10} /> {viewsCount.toLocaleString("ru")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
