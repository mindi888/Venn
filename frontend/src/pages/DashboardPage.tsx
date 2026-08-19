import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { api, type Movie } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import type { WatchedMovie } from "@/lib/supabase";

function SectionSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[2/3] bg-card rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);

  const [randomSelection, setrandomSelection] = useState<Movie[]>([]);
  const [randomLoading, setrandomLoading] = useState(true);
  const [randomError, setrandomError] = useState(false);

  const [recentReleases, setRecentReleases] = useState<Movie[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState(false);

  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);
  const [topRatedError, setTopRatedError] = useState(false);

  const [recs, setRecs] = useState<Movie[]>([]);
  const [recsLoading, setRecsLoading] = useState(true);
  const [recsError, setRecsError] = useState(false);

  useEffect(() => {
    api.randomMovies(5)
      .then(setrandomSelection)
      .catch(() => setrandomError(true))
      .finally(() => setrandomLoading(false));

    api.latestMovies(6)
      .then(setRecentReleases)
      .catch(() => setRecentError(true))
      .finally(() => setRecentLoading(false));

    api.topRatedMovies(12)
      .then(setTopRated)
      .catch(() => setTopRatedError(true))
      .finally(() => setTopRatedLoading(false));
  }, []);

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
        {/* Random Selection */}
        <section className="mb-14">
          <SectionHeader title="Random Selection" sub="Five random picks every time you refresh" />
          {randomError ? (
            <p className="text-sm text-muted-foreground">Couldn't load today's picks — try refreshing.</p>
          ) : randomLoading ? (
            <SectionSkeleton count={5} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {randomSelection.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} />)}
            </div>
          )}
        </section>

        {/* Recent Releases */}
        <section className="mb-14">
          <SectionHeader title="Recent Releases" sub="Latest films added to the catalogue." />
          {recentError ? (
            <p className="text-sm text-muted-foreground">Couldn't load recent releases — try refreshing.</p>
          ) : recentLoading ? (
            <SectionSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {recentReleases.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} />)}
            </div>
          )}
        </section>

        {/* Top Rated of All Time */}
        <section className="mb-14">
          <SectionHeader title="Top Rated of All Time" sub="The highest-rated films in the catalogue." />
          {topRatedError ? (
            <p className="text-sm text-muted-foreground">Couldn't load top rated films — try refreshing.</p>
          ) : topRatedLoading ? (
            <SectionSkeleton count={10} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topRated.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} />)}
            </div>
          )}
        </section>

        {/* Recommendations */}
        <section>
          <SectionHeader title="Recommended for you" sub={watched.length === 0 ? "Favorite some movies to get personalized picks." : undefined} />
          {recsError ? (
            <p className="text-sm text-muted-foreground">Recommendation service unavailable right now.</p>
          ) : recsLoading ? (
            <SectionSkeleton count={12} />
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