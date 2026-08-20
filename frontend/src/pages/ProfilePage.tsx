import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, type WatchedMovie } from "@/lib/supabase";
import MovieModal from "@/components/MovieModal";
import GenreRadar from "@/components/GenreRadar";
import { buildGenreProfile } from "@/lib/genres";
import type { Movie } from "@/lib/api";
import { api } from "@/lib/api";

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

export default function ProfilePage() {
  const { profile } = useAuth();
  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [selected, setSelected] = useState<Movie | null>(null);

  useEffect(() => {
    supabase
      .from("watched_movies")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setWatched(data ?? []);
      });
  }, []);

  const genreData = buildGenreProfile(watched);
  const recent = watched.slice(0, 12);
  const favoritedCount = watched.filter((m) => m.liked).length;
  const topGenre = genreData[0]?.genre ?? "—";

  // Build activity data from when movies were added
  const activityMap: Record<string, number> = {};

  watched.forEach((movie) => {
    if (!movie.created_at) return;

    const date = new Date(movie.created_at);
    const key = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    activityMap[key] = (activityMap[key] ?? 0) + 1;
  });

  const activityData = Object.entries(activityMap).reverse();

  // #region agent log
  const renderCount = useRef(0);
  renderCount.current += 1;
  useEffect(() => {
    fetch("http://127.0.0.1:7897/ingest/43dc3874-8bb0-41ba-b4c3-0b2bba6c83f7", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4abc99" },
      body: JSON.stringify({
        sessionId: "4abc99",
        runId: "post-fix",
        hypothesisId: "C",
        location: "ProfilePage.tsx:render",
        message: "profile-render",
        data: {
          renderCount: renderCount.current,
          watchedLen: watched.length,
          activityBars: activityData.length,
          blurOrbs: document.querySelectorAll('[class*="blur-3xl"]').length,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  });
  // #endregion

  const openMovie = async (m: WatchedMovie) => {
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

  return (
    <div className="min-h-screen pt-20 pb-20">

      {/* ================= PROFILE HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gold/5" />
          <div className="absolute top-20 -left-40 w-80 h-80 rounded-full bg-accent/5" />
        </div>

        <div className="relative px-4 max-w-6xl mx-auto pt-10 pb-8">
          <div className="flex items-center gap-5">

            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center text-3xl overflow-hidden shadow-xl">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "🎬"
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-accent uppercase tracking-[0.25em] mb-2">
                Film profile
              </p>

              <h1 className="font-fun text-4xl md:text-5xl text-gold leading-none">
                {profile?.display_name ?? profile?.username}
              </h1>

              <p className="text-muted-foreground text-sm mt-2">
                @{profile?.username}
              </p>

              {profile?.bio && (
                <p className="text-sm text-foreground/70 mt-3 max-w-md">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="px-4 max-w-6xl mx-auto mb-10">
        <div className="border-y border-border py-7">
          <div className="grid grid-cols-3 divide-x divide-border">
            <ProfileStat
              value={watched.length}
              label="Films watched"
            />

            <ProfileStat
              value={favoritedCount}
              label="Favorited"
            />

            <ProfileStat
              value={topGenre}
              label="Top genre"
              isText
            />
          </div>
        </div>
      </section>

      {/* ================= TASTE + ACTIVITY ================= */}
      <section className="px-4 max-w-6xl mx-auto mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Taste Profile */}
          <div>
            <div className="mb-5">
              <p className="text-xs text-accent uppercase tracking-[0.25em] mb-1">
                What you watch
              </p>

              <h2 className="font-display text-2xl font-semibold text-foreground">
                Your taste profile
              </h2>
            </div>

            {/* RADAR */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 h-full">
              <GenreRadar data={genreData} size={340} />
            </div>
          </div>

          {/* Activity */}
          <div>
            <div className="mb-5">
              <p className="text-xs text-accent uppercase tracking-[0.25em] mb-1">
                Your viewing history
              </p>

              <h2 className="font-display text-2xl font-semibold text-foreground">
                Activity
              </h2>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 h-full">
              {activityData.length === 0 ? (
                <div className="h-full min-h-[340px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Start watching films to see your activity.
                  </p>
                </div>
              ) : (
                <div className="h-full min-h-[340px] flex flex-col justify-end">

                  <div className="flex items-end gap-2 h-[260px]">
                    {activityData.map(([month, count]) => {
                      const max = Math.max(
                        ...activityData.map(([, value]) => value)
                      );

                      const height = Math.max(
                        8,
                        (count / max) * 100
                      );

                      return (
                        <div
                          key={month}
                          className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                        >
                          <span className="text-xs text-muted-foreground">
                            {count}
                          </span>

                          <div
                            className="w-full max-w-10 bg-accent/70 rounded-t-md transition-all hover:bg-accent"
                            style={{ height: `${height}%` }}
                            title={`${count} ${
                              count === 1 ? "film" : "films"
                            } added in ${month}`}
                          />

                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {month}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-border mt-5 pt-4">
                    <p className="text-xs text-muted-foreground">
                      Films added to your watch history over time
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ================= RECENTLY WATCHED ================= */}
      <section className="px-4 max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl font-semibold text-gold">
            Recently Watched
          </h2>
        </div>

        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No films watched yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {recent.map((m) => (
              <button
                key={m.id}
                onClick={() => openMovie(m)}
                className="group relative aspect-[2/3] bg-muted rounded-lg overflow-hidden"
              >
                {m.poster_path ? (
                  <img
                    src={`${TMDB_IMG}${m.poster_path}`}
                    alt={m.movie_title}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-center p-1 text-muted-foreground">
                    {m.movie_title}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <MovieModal
        movie={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function ProfileStat({
  value,
  label,
  isText = false,
}: {
  value: string | number;
  label: string;
  isText?: boolean;
}) {
  return (
    <div className="px-4 md:px-8 text-center first:pl-0 last:pr-0">
      <p
        className={`font-fun ${
          isText ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl"
        } text-foreground leading-none`}
      >
        {value}
      </p>

      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest mt-2">
        {label}
      </p>
    </div>
  );
}