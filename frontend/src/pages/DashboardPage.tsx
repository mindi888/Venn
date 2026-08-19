import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { api, type Movie } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import type { WatchedMovie } from "@/lib/supabase";

const PLACEHOLDER_FILMS: Movie[] = [
  { id: 238,   title: "The Godfather",                                 poster_path: "/3bhkrj58Vtu7enYsLlegkAoVJ1L.jpg", release_date: "1972-03-14", genres: ["Crime","Drama"],           runtime: 175, vote_average: 9.2, overview: null, tagline: null, cast: [], director: ["Francis Ford Coppola"] },
  { id: 278,   title: "The Shawshank Redemption",                      poster_path: "/lyQBXAf8xmHy5edy4mQtMQuFdAx.jpg", release_date: "1994-09-23", genres: ["Drama"],                   runtime: 142, vote_average: 9.3, overview: null, tagline: null, cast: [], director: ["Frank Darabont"] },
  { id: 155,   title: "The Dark Knight",                               poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", release_date: "2008-07-14", genres: ["Action","Crime","Drama"],  runtime: 152, vote_average: 9.0, overview: null, tagline: null, cast: [], director: ["Christopher Nolan"] },
  { id: 680,   title: "Pulp Fiction",                                  poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", release_date: "1994-09-10", genres: ["Thriller","Crime"],        runtime: 154, vote_average: 8.9, overview: null, tagline: null, cast: [], director: ["Quentin Tarantino"] },
  { id: 424,   title: "Schindler's List",                              poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg", release_date: "1993-11-30", genres: ["History","Drama","War"],   runtime: 195, vote_average: 9.0, overview: null, tagline: null, cast: [], director: ["Steven Spielberg"] },
  { id: 122,   title: "The Lord of the Rings: The Return of the King", poster_path: "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg", release_date: "2003-12-17", genres: ["Adventure","Fantasy"],    runtime: 201, vote_average: 9.0, overview: null, tagline: null, cast: [], director: ["Peter Jackson"] },
  { id: 389,   title: "12 Angry Men",                                  poster_path: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg", release_date: "1957-04-10", genres: ["Drama"],                   runtime: 96,  vote_average: 9.0, overview: null, tagline: null, cast: [], director: ["Sidney Lumet"] },
  { id: 429,   title: "The Good, the Bad and the Ugly",                poster_path: "/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg", release_date: "1966-12-23", genres: ["Western"],                 runtime: 178, vote_average: 8.8, overview: null, tagline: null, cast: [], director: ["Sergio Leone"] },
  { id: 550,   title: "Fight Club",                                    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", release_date: "1999-10-15", genres: ["Drama","Thriller"],        runtime: 139, vote_average: 8.8, overview: null, tagline: null, cast: [], director: ["David Fincher"] },
  { id: 13,    title: "Forrest Gump",                                  poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", release_date: "1994-07-06", genres: ["Comedy","Drama","Romance"],runtime: 142, vote_average: 8.8, overview: null, tagline: null, cast: [], director: ["Robert Zemeckis"] },
  { id: 19404, title: "3 Idiots",                                      poster_path: "/66A9MqXOyVFCssoloscw79z8Tew.jpg",  release_date: "2009-12-25", genres: ["Comedy","Drama"],          runtime: 170, vote_average: 8.4, overview: null, tagline: null, cast: [], director: ["Rajkumar Hirani"] },
  { id: 637,   title: "Life Is Beautiful",                             poster_path: "/74hLDKjD5aGYOotO6esUVaeISa2.jpg",  release_date: "1997-12-20", genres: ["Comedy","Drama","War"],    runtime: 116, vote_average: 8.5, overview: null, tagline: null, cast: [], director: ["Roberto Benigni"] },
];

function dailyShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [recs, setRecs] = useState<Movie[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState(false);
  const [selected, setSelected] = useState<Movie | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("watched_movies").select("*").order("created_at", { ascending: false });
      const w = data ?? [];
      setWatched(w);
      const favorited = w.filter(m => m.liked).map(m => m.movie_title);
      if (favorited.length === 0) { setRecsLoading(false); return; }
      try {
        const results = await api.coldstart(favorited);
        const favSet = new Set(favorited.map(t => t.toLowerCase()));
        setRecs(results.map(r => ({
          ...r,
          reason: favSet.has(r.title.toLowerCase()) ? undefined : `Matches your taste for ${r.genres?.[0] ?? "cinema"}`,
        })));
      } catch { setRecsError(true); }
      setRecsLoading(false);
    };
    load();
  }, []);

  const dailySelection = useMemo(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return dailyShuffle(PLACEHOLDER_FILMS, seed).slice(0, 5);
  }, []);

  const recentReleases = useMemo(() =>
    [...PLACEHOLDER_FILMS].sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")).slice(0, 6),
  []);

  const name = profile?.display_name ?? profile?.username ?? "there";

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="relative pt-32 pb-20 px-4 text-center overflow-hidden">
        {/* faint background rings */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[600px] h-[600px] rounded-full border border-white/[0.03]" />
          <div className="absolute w-[400px] h-[400px] rounded-full border border-white/[0.04]" />
          <div className="absolute w-[220px] h-[220px] rounded-full border border-white/[0.06]" />
        </div>

        <p className="text-sm text-muted-foreground tracking-widest uppercase mb-4">
          Welcome back, <span className="text-gold font-medium">{name}</span>
        </p>
        <h1 className="text-6xl sm:text-7xl text-foreground mb-3 leading-none font-bold" style={{fontFamily:"'Ranchers', sans-serif", letterSpacing:"0.04em"}}>Venn</h1>
        <p className="font-display text-xl text-gold mb-3">When your tastes overlap</p>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
          Tell us what you love.<br />We'll find what fits.
        </p>
      </div>

      <div className="px-4 max-w-7xl mx-auto">
        {/* Daily Selection */}
        <section className="mb-14">
          <SectionHeader title="Daily Selection" sub="Five picks refreshed every day." />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {dailySelection.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} />)}
          </div>
        </section>

        {/* Recent Releases */}
        <section className="mb-14">
          <SectionHeader title="Recent Releases" sub="Latest films added to the catalogue." />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentReleases.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} />)}
          </div>
        </section>

        {/* Recommendations */}
        <section>
          <SectionHeader title="Recommended for you" sub={watched.length === 0 ? "Favorite some movies to get personalized picks." : undefined} />
          {recsError ? (
            <p className="text-sm text-muted-foreground">Recommendation service unavailable right now.</p>
          ) : recsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({length:12}).map((_,i) => <div key={i} className="aspect-[2/3] bg-card rounded-xl animate-pulse" />)}
            </div>
          ) : recs.length === 0 ? null : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recs.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} reason={m.reason} />)}
            </div>
          )}
        </section>
      </div>

      <MovieModal movie={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5 flex items-end gap-4">
      <h2 className="font-display text-2xl font-semibold text-gold">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mb-0.5">{sub}</p>}
    </div>
  );
}
