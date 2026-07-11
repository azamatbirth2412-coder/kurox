"use client";
import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value?: number;
  onRate?: (score: number) => void;
  readonly?: boolean;
  size?: number;
}

export function StarRating({ value = 0, onRate, readonly = false, size = 20 }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
          aria-label={`Оценка ${star} из 5`}
        >
          <Star
            size={size}
            className={`transition-colors ${
              (hover || value) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
