import type { WatchedMovie } from "./supabase";

export function buildGenreProfile(watched: WatchedMovie[]) {
  const scores: Record<string, number> = {};
  for (const m of watched) {
    const weight = m.liked ? 2 : 1;
    for (const g of m.genres ?? []) {
      scores[g] = (scores[g] ?? 0) + weight;
    }
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([genre, score]) => ({ genre, score: Math.round((score / max) * 100) }));
}
