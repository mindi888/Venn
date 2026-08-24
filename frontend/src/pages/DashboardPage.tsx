import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { api, type Movie } from "@/lib/api";
import MovieCard from "@/components/MovieCard";
import MovieModal from "@/components/MovieModal";
import type { WatchedMovie } from "@/lib/supabase";
import heroBg from "../assets/hero-overlay.svg";

type OverlapLevel = "tight" | "normal" | "loose";

type DashCache = {
  random: Movie[];
  recent: Movie[];
  topRated: Movie[];
  recs: Movie[];
  watched: WatchedMovie[];
  liked: [number, boolean][];
  favorited: string[];
  watchedIds: number[];
};

let dashCache: DashCache | null = null;

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
  const [watched, setWatched] = useState<WatchedMovie[]>(dashCache?.watched ?? []);
  const [selected, setSelected] = useState<Movie | null>(null);
  const [likedMap, setLikedMap] = useState<Map<number, boolean>>(() => new Map(dashCache?.liked ?? []));

  const [randomSelection, setrandomSelection] = useState<Movie[]>(dashCache?.random ?? []);
  const [randomLoading, setrandomLoading] = useState(!dashCache);
  const [randomError, setrandomError] = useState(false);

  const [recentReleases, setRecentReleases] = useState<Movie[]>(dashCache?.recent ?? []);
  const [recentLoading, setRecentLoading] = useState(!dashCache);
  const [recentError, setRecentError] = useState(false);

  const [topRated, setTopRated] = useState<Movie[]>(dashCache?.topRated ?? []);
  const [topRatedLoading, setTopRatedLoading] = useState(!dashCache);
  const [topRatedError, setTopRatedError] = useState(false);

  const [recs, setRecs] = useState<Movie[]>(dashCache?.recs ?? []);
  const [recsLoading, setRecsLoading] = useState(!dashCache);
  const [recsError, setRecsError] = useState(false);
  const [overlap, setOverlap] = useState<OverlapLevel>("normal");
  const [favoritedTitles, setFavoritedTitles] = useState<string[]>(dashCache?.favorited ?? []);
  const [watchedIds, setWatchedIds] = useState<Set<number>>(() => new Set(dashCache?.watchedIds ?? []));

  const persistCache = (
    patch: Partial<{
      random: Movie[];
      recent: Movie[];
      topRated: Movie[];
      recs: Movie[];
      watched: WatchedMovie[];
      liked: Map<number, boolean>;
      favorited: string[];
      watchedIds: Set<number>;
    }>,
  ) => {
    dashCache = {
      random: patch.random ?? dashCache?.random ?? [],
      recent: patch.recent ?? dashCache?.recent ?? [],
      topRated: patch.topRated ?? dashCache?.topRated ?? [],
      recs: patch.recs ?? dashCache?.recs ?? [],
      watched: patch.watched ?? dashCache?.watched ?? [],
      liked: patch.liked ? Array.from(patch.liked.entries()) : dashCache?.liked ?? [],
      favorited: patch.favorited ?? dashCache?.favorited ?? [],
      watchedIds: patch.watchedIds ? Array.from(patch.watchedIds) : dashCache?.watchedIds ?? [],
    };
  };

  useEffect(() => {
    if (dashCache?.random.length) {
      setrandomLoading(false);
      setRecentLoading(false);
      setTopRatedLoading(false);
      return;
    }
    api.randomMovies(5).then((m) => { setrandomSelection(m); persistCache({ random: m }); }).catch(() => setrandomError(true)).finally(() => setrandomLoading(false));
    api.latestMovies(6).then((m) => { setRecentReleases(m); persistCache({ recent: m }); }).catch(() => setRecentError(true)).finally(() => setRecentLoading(false));
    api.topRatedMovies(12).then((m) => { setTopRated(m); persistCache({ topRated: m }); }).catch(() => setTopRatedError(true)).finally(() => setTopRatedLoading(false));
  }, []);

  const fetchRecs = async (favorited: string[], watchedIdSet: Set<number>, overlapLevel: OverlapLevel) => {
    setRecsLoading(true);
    setRecsError(false);
    try {
      const results = await api.coldstart(favorited, 2, 18, overlapLevel);
      const favSet = new Set(favorited.map(t => t.toLowerCase()));
      const mapped = results.map(r => ({
        ...r,
        reason: favSet.has(r.title.toLowerCase()) ? undefined : `Matches your taste for ${r.genres?.[0] ?? "cinema"}`,
      }));
      setRecs(mapped);
      persistCache({ recs: mapped });
    } catch {
      setRecsError(true);
    }
    setRecsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      if (dashCache) {
        setRecsLoading(false);
        return;
      }
      const { data } = await supabase.from("watched_movies").select("*").order("created_at", { ascending: false });
      const w = data ?? [];
      setWatched(w);
      const ids = new Set(w.map(m => m.movie_id));
      setWatchedIds(ids);
      const liked = new Map(w.map(m => [m.movie_id, m.liked === true] as const));
      setLikedMap(liked);
      const favorited = w.filter(m => m.liked).map(m => m.movie_title);
      setFavoritedTitles(favorited);
      persistCache({ watched: w, watchedIds: ids, liked, favorited });
      if (favorited.length === 0) { setRecsLoading(false); persistCache({ recs: [] }); return; }
      await fetchRecs(favorited, ids, "normal");
    };
    init();
  }, []);

  const changeOverlap = (level: OverlapLevel) => {
    setOverlap(level);
    if (favoritedTitles.length > 0) fetchRecs(favoritedTitles, watchedIds, level);
  };

  const name = profile?.display_name ?? profile?.username ?? "there";

  return (
    <div className="pb-10">
      <div className="relative pt-35 pb-15 px-4 text-center overflow-hidden bg-black">
        {/* SVG background */}
        <img 
          src={heroBg} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover object-center z-0" 
        />

        {/* Hero content, on top */}
        <div className="relative z-10">
          <p className="text-sm text-muted-foreground tracking-widest uppercase mb-4">
            Welcome back, <span className="text-gold font-medium">{name}</span>
          </p>
          <h1 className="text-6xl sm:text-7xl text-foreground mb-3 leading-none font-bold" style={{fontFamily:"'Ranchers', sans-serif", letterSpacing:"0.04em"}}>Venn</h1>
          <p className="font-display text-xl text-gold mb-3">When your tastes overlap</p>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed mt-4">
            Tell us what you love.<br />We'll find what fits.
          </p>
        </div>
      </div>

      <div className="pt-14 px-4 max-w-7xl mx-auto">
        <section className="mb-14">
          <SectionHeader title="Random Selection" sub="Five random picks every time you refresh." />
          {randomError ? <p className="text-sm text-muted-foreground">Couldn't load today's picks — try refreshing.</p>
            : randomLoading ? <SectionSkeleton count={5} />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {randomSelection.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} likedOverride={likedMap.get(m.id) ?? false} />)}
              </div>}
        </section>

        <section className="mb-14">
          <SectionHeader title="Recent Releases" sub="Latest films added to the catalogue." />
          {recentError ? <p className="text-sm text-muted-foreground">Couldn't load recent releases — try refreshing.</p>
            : recentLoading ? <SectionSkeleton count={6} />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recentReleases.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} likedOverride={likedMap.get(m.id) ?? false} />)}
              </div>}
        </section>

        <section className="mb-14">
          <SectionHeader title="Top Rated of All Time" sub="The highest-rated films in the catalogue." />
          {topRatedError ? <p className="text-sm text-muted-foreground">Couldn't load top rated films — try refreshing.</p>
            : topRatedLoading ? <SectionSkeleton count={10} />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {topRated.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} likedOverride={likedMap.get(m.id) ?? false} />)}
              </div>}
        </section>

        <section>
          <div className="mb-0 flex flex-wrap items-end justify-between gap-4">
            <SectionHeader title="Recommended for you" sub={watched.length === 0 ? "Favorite some movies to get personalized picks." : undefined} />
            {favoritedTitles.length > 0 && (
              <div className="mb-4 flex gap-2">
                <button onClick={() => changeOverlap("tight")}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${overlap === "tight" ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  More Overlap
                </button>
                <button onClick={() => changeOverlap("normal")}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${overlap === "normal" ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  Balanced
                </button>
                <button onClick={() => changeOverlap("loose")}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${overlap === "loose" ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  Less Overlap
                </button>
              </div>
            )}
          </div>
          {recsError ? <p className="text-sm text-muted-foreground">Recommendation service unavailable right now.</p>
            : recsLoading ? <SectionSkeleton count={12} />
            : recs.length === 0 ? null
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {recs.map(m => <MovieCard key={m.id} movie={m} onClick={setSelected} reason={m.reason} likedOverride={likedMap.get(m.id) ?? false} />)}
              </div>}
        </section>
      </div>

      <MovieModal movie={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-1 border-l-2 border-primary/40 pl-4">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-2xl font-bold text-gold tracking-tight uppercase">
          {title}
        </h2>
      </div>
      {sub && (
        <p className="text-xs text-muted-foreground tracking-wide font-medium max-w-xl">
          {sub}
        </p>
      )}
    </div>
  );
}