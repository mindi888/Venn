import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, type WatchedMovie } from "@/lib/supabase";
import MovieModal from "@/components/MovieModal";
import GenreRadar from "@/components/GenreRadar";
import { buildGenreProfile } from "@/lib/genres";
import type { Movie } from "@/lib/api";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

export default function ProfilePage() {
  const { profile } = useAuth();
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);

  useEffect(() => {
    supabase.from("watched_movies").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setWatched(data ?? []);
    });
  }, []);

  const genreData = buildGenreProfile(watched);
  const recent = watched.slice(0, 12);
  const favoritedCount = watched.filter(m => m.liked).length;
  const topGenre = genreData[0]?.genre ?? "—";

  const toMovie = (m: WatchedMovie): Movie => ({
    id: m.movie_id, title: m.movie_title, poster_path: m.poster_path ?? null,
    runtime: null, vote_average: m.rating, release_date: m.watched_date,
    genres: m.genres ?? [], overview: null, tagline: null, cast: [], director: [],
  });

  return (
    <div className="pt-20 pb-16">
      {/* Identity strip */}
      <div className="px-4 max-w-6xl mx-auto mt-8 mb-12 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center text-2xl shrink-0 overflow-hidden">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            : "🎬"}
        </div>
        <div>
          <h1 className="font-fun text-3xl text-gold leading-none">{profile?.display_name ?? profile?.username}</h1>
          <p className="text-muted-foreground text-sm mt-1">@{profile?.username}</p>
          {profile?.bio && <p className="text-sm text-foreground/70 mt-1 max-w-md">{profile.bio}</p>}
        </div>
      </div>

      {/* Stats + Radar — asymmetric two-col */}
      <div className="px-4 max-w-6xl mx-auto mb-14 grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
        {/* Left: stats stacked */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <p className="text-s text-accent uppercase tracking-widest mb-1">Your numbers</p>
          <StatBlock value={watched.length} label="Films watched" />
          <StatBlock value={favoritedCount} label="Favorited" />
          <StatBlock value={topGenre} label="Top genre" />
        </div>

        
        {/* Right: radar — bigger, takes 3 cols */}
        <div className="md:col-span-3 bg-card border border-border rounded-2xl p-6">
          <p className="text-s text-accent uppercase tracking-widest mb-4">Taste profile</p>
          <GenreRadar data={genreData} size={340} />
        </div>
      </div>

      {/* Recently Watched */}
      <div className="px-4 max-w-6xl mx-auto">
        <h2 className="font-display text-xl font-semibold text-gold mb-5">Recently Watched</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No films watched yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {recent.map(m => (
              <button
                key={m.id}
                onClick={() => setSelected(toMovie(m))}
                className="group relative aspect-[2/3] bg-muted rounded-lg overflow-hidden"
              >
                {m.poster_path
                  ? <img src={`${TMDB_IMG}${m.poster_path}`} alt={m.movie_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  : <div className="w-full h-full flex items-center justify-center text-xs text-center p-1 text-muted-foreground">{m.movie_title}</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      <MovieModal movie={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function StatBlock({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-5 bg-card border border-border rounded-xl px-6 py-5">
      <p className="font-fun text-5xl text-foreground leading-none">{value}</p>
      <p className="text-sm text-muted-foreground leading-snug">{label}</p>
    </div>
  );
}
