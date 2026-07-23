// Animated anime avatars — 4-frame GIF files in /public/avatars/
export const ANIME_AVATARS = Array.from({ length: 24 }, (_, i) => ({
  id: `avatar_${String(i + 1).padStart(2, "0")}`,
  name: `Аниме ${i + 1}`,
  url: `/avatars/avatar_${String(i + 1).padStart(2, "0")}a.gif`,
}));
