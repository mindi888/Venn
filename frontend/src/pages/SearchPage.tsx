import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type Movie } from "@/lib/api";
import { supabase } from "@/lib/supabase"; 
import { useAuth } from "@/lib/auth"; 
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";

export default function SearchPage() {
  const { user } = useAuth(); 
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [error, setError] = useState("");
  const [likedMap, setLikedMap] = useState<Map<number, boolean>>(new Map()); 
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the user's full liked/watched map once, reused for every card
  useEffect(() => {
    if (!user) return;
    supabase.from("watched_movies").select("movie_id, liked").eq("user_id", user.id)
      .then(({ data }) => {
        setLikedMap(new Map((data ?? []).map(d => [d.movie_id, d.liked === true])));
      });
  }, [user]);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) { setQuery(q); search(q); }
  }, []);

  const search = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        setResults(await api.searchMovies(q, 18));
        setSearched(true);
      } catch { setError("Search service unavailable."); }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="pt-20 pb-16 px-4 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-gold mb-6">Search Films</h1>
        <div className="relative max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search by title…"
            autoFocus
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

      {searched && results.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">No results for "{query}"</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {results.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} likedOverride={likedMap.get(m.id) ?? false} />)}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-5xl mb-4">🎞</p>
          <p className="text-sm">Start typing to discover films</p>
        </div>
      )}

      <MovieModal movie={selected} onClose={() => setSelected(null)} />
    </div>
  );
}