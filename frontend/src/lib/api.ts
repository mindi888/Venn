const LOCAL = import.meta.env.VITE_API_URL_LOCAL ?? "http://localhost:9000";
const REMOTE = import.meta.env.VITE_API_URL ?? LOCAL;

function resolveApiBase(): string {
  if (typeof window === "undefined") return REMOTE;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return LOCAL;
  return REMOTE;
}

const BASE = resolveApiBase();

export type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  runtime: number | null;
  vote_average: number | null;
  release_date: string | null;
  genres: string[];
  overview: string | null;
  tagline: string | null;
  cast: string[];
  director: string[];
  wildcard?: boolean;
  reason?: string;
};

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  searchMovies: async (q: string, limit = 12): Promise<Movie[]> => {
    const res = await fetch(`${BASE}/movies/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  getMovie: async (id: number): Promise<Movie> => {
    const res = await fetch(`${BASE}/movies/${id}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  randomMovies: async (limit = 5): Promise<Movie[]> => {
    const res = await fetch(`${BASE}/movies/random?limit=${limit}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  latestMovies: async (limit = 5): Promise<Movie[]> => {
    const res = await fetch(`${BASE}/movies/latest?limit=${limit}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  topRatedMovies: async (limit = 12): Promise<Movie[]> => {
    const res = await fetch(`${BASE}/movies/top-rated?limit=${limit}`);
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  similar: (movie_title: string, max_per_franchise = 2, n_results = 24, include_wildcard = true, exclude_ids: number[] = []) =>
    post<Movie[]>("/recommend/similar", { movie_title, max_per_franchise, n_results, include_wildcard, exclude_ids }),

  coldstart: (movie_titles: string[], max_per_franchise = 2, n_results = 24, overlap: "tight" | "normal" | "loose" = "normal", exclude_ids: number[] = []) =>
    post<Movie[]>("/recommend/coldstart", { movie_titles, max_per_franchise, n_results, overlap, exclude_ids }),

  watchedBefore: (movie_titles: string[], max_per_director = 3, n_results = 24, keyword_weight = 0.3, exclude_ids: number[] = []) =>
    post<Movie[]>("/recommend/watched-before", { movie_titles, max_per_director, n_results, keyword_weight, exclude_ids }),
};
