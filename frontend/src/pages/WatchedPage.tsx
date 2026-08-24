import { useEffect, useState } from "react";
import { supabase, type WatchedMovie } from "@/lib/supabase";
import { api, type Movie } from "@/lib/api";
import MovieModal from "@/components/MovieModal";
import StarRating from "@/components/StarRating";

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

type Filter = "all" | "liked" | "unrated";
type SortOption = "recent" | "rating-desc" | "rating-asc";

export default function WatchedPage() {
  const [movies, setMovies] = useState<WatchedMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [selected, setSelected] = useState<Movie | null>(null);
  const [batchRecs, setBatchRecs] = useState<Movie[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [confirmedWatched, setConfirmedWatched] = useState<Set<number>>(new Set());

  const load = async () => {
    const { data } = await supabase.from("watched_movies").select("*").order("created_at", { ascending: false });
    setMovies(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = movies
    .filter(m => {
      if (filter === "liked") return m.liked === true;
      if (filter === "unrated") return m.rating == null;
      return true;
    })
    .sort((a, b) => {
      if (sort === "rating-desc") return (b.rating ?? -1) - (a.rating ?? -1);
      if (sort === "rating-asc") return (a.rating ?? 11) - (b.rating ?? 11);
      return 0; // "recent" — keep the created_at order already applied by the query
    });

  const openModal = async (m: WatchedMovie) => {
    try {
      const full = await api.getMovie(m.movie_id);
      setSelected(full);
    } catch {
      setSelected({
        id: m.movie_id,
        title: m.movie_title,
        poster_path: m.poster_path ?? null,
        runtime: null,
        vote_average: null,
        release_date: m.watched_date,
        genres: m.genres ?? [],
        overview: null,
        tagline: null,
        cast: [],
        director: [],
      });
    }
  };

  const getRecs = async () => {
    setBatchLoading(true);
    setShowBatch(true);
    const titles = movies.filter(m => m.liked).map(m => m.movie_title);
    try {
      const recs = await api.watchedBefore(titles);
      setBatchRecs(recs);
    } catch { setBatchRecs([]); }
    setBatchLoading(false);
  };

  const toggleWatched = async (movie: Movie) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (confirmedWatched.has(movie.id)) {
      await supabase.from("watched_movies").delete().eq("user_id", user.id).eq("movie_id", movie.id);
      setConfirmedWatched(prev => {
        const next = new Set(prev);
        next.delete(movie.id);
        return next;
      });
    } else {
      await supabase.from("watched_movies").upsert({
        user_id: user.id,
        movie_id: movie.id,
        movie_title: movie.title,
        poster_path: movie.poster_path,
        genres: movie.genres,
        watched_date: new Date().toISOString().slice(0, 10),
      }, { onConflict: "user_id,movie_id" });
      setConfirmedWatched(prev => new Set(prev).add(movie.id));
    }
    await load();
  };

  return (
    <div className="pt-30 pb-16 px-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-semibold text-gold">Watched Films</h1>
        <button onClick={getRecs} disabled={batchLoading}
          className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0">
          {batchLoading ? "Loading…" : "Get Recommendations"}
        </button>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {(["all","liked","unrated"] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors capitalize ${filter === f ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? `All (${movies.length})` : f === "liked" ? "Favorited" : "Unrated"}
          </button>
        ))}
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="text-sm px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring ml-auto"
        >
          <option value="recent">Sort: Recently Added</option>
          <option value="rating-desc">Sort: Rating (High → Low)</option>
          <option value="rating-asc">Sort: Rating (Low → High)</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i)=><div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-5xl mb-3">🎬</p>
          <p className="text-sm">No films here yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(m => (
            <div key={m.id} role="button" tabIndex={0} onClick={() => openModal(m)} onKeyDown={e => e.key === "Enter" && openModal(m)}
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-colors group">
              <div className="w-10 h-14 bg-muted rounded shrink-0 overflow-hidden">
                {m.poster_path
                  ? <img src={`${TMDB_IMG}${m.poster_path}`} alt={m.movie_title} className="w-full h-full object-cover" />
                  : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{m.movie_title}</p>
                <p className="text-xs text-muted-foreground mb-1">{m.watched_date ?? "—"}</p>
                {m.rating != null && <StarRating value={m.rating} readOnly size="sm" />}
              </div>
              <span className="text-lg shrink-0 text-red-400 scale-x-120">{m.liked === true ? "♥" : ""}</span>
            </div>
          ))}
        </div>
      )}

      {showBatch && (
        <div className="mt-12">
          {/* Header Block */}
          <div className="mb-6 flex flex-col gap-1 border-l-2 border-primary/40 pl-4">
            <h2 className="font-display text-2xl font-bold text-gold tracking-tight uppercase">
              Seen any of these?
            </h2>
            <p className="text-xs text-muted-foreground tracking-wide font-medium max-w-xl">
              Check any films you've already seen — we'll refine your recommendations.
            </p>
          </div>
          {batchLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({length:8}).map((_,i)=><div key={i} className="aspect-[2/3] bg-card rounded-xl animate-pulse"/>)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {batchRecs.map(m => {
                const done = confirmedWatched.has(m.id);
                return (
                  <div key={m.id} className="relative">
                    <button onClick={() => toggleWatched(m)} 
                      className={`group relative flex flex-col rounded-xl overflow-hidden bg-card border transition-all duration-200 w-full text-left ${done ? "border-green-500/50 opacity-75" : "border-border hover:border-primary/40"}`}>
                      <div className="aspect-[2/3] bg-muted overflow-hidden">
                        {m.poster_path
                          ? <img src={`https://image.tmdb.org/t/p/w185${m.poster_path}`} alt={m.title} className="w-full h-full object-cover" loading="eager" decoding="async" />
                          : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center p-2">{m.title}</div>}
                        {!done && <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-2xl">✓</span>
                        </div>}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-foreground line-clamp-1">{m.title}</p>
                        {done && <p className="text-xs text-green-400 mt-0.5">Marked watched</p>}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <MovieModal movie={selected} onClose={() => { setSelected(null); load(); }} />
    </div>
  );
}