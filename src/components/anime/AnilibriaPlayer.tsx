"use client";

interface Props {
  id: number;
  episode?: number;
  title: string;
}

export function AnilibriaPlayer({ id, episode = 1, title }: Props) {
  const src = `https://anilibria.top/player/v2/?id=${id}&episode=${episode}`;
  return (
    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/50">
      <iframe
        src={src}
        title={title}
        allowFullScreen
        allow="autoplay; fullscreen"
        className="w-full h-full border-0"
      />
    </div>
  );
}
