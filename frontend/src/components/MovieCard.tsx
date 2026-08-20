import { useState, useEffect } from "react";
import type { Movie } from "@/lib/api";
import { HeartIcon } from "./HeartIcon";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

type Props = {
  movie: Movie;
  onClick: (movie: Movie) => void;
  reason?: string;
  likedOverride?: boolean; // when provided, skips the individual Supabase fetch
};

export default function MovieCard({ movie, onClick, reason, likedOverride }: Props) {
  const { user } = useAuth();
  const year = movie.release_date || movie.release_date || "—"
  const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
  const [liked, setLiked] = useState<boolean>(likedOverride ?? false);

  // Keep in sync if the parent's map updates (e.g. after a heart toggle elsewhere)
  useEffect(() => {
    if (likedOverride !== undefined) setLiked(likedOverride);
  }, [likedOverride]);

  useEffect(() => {
    if (likedOverride !== undefined) return; // parent already supplied the answer
    if (!user) return;
    supabase
      .from("watched_movies")
      .select("liked")
      .eq("user_id", user.id)
      .eq("movie_id", movie.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setLiked(data.liked === true); });
  }, [user, movie.id, likedOverride]);

  const toggleHeart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const next = !liked;
    setLiked(next);
    await supabase.from("watched_movies").upsert({
      user_id: user.id,
      movie_id: movie.id,
      movie_title: movie.title,
      poster_path: movie.poster_path,
      liked: next,
      genres: movie.genres,
      watched_date: new Date().toISOString().slice(0, 10),
    }, { onConflict: "user_id,movie_id" });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(movie)}
      onKeyDown={e => e.key === "Enter" && onClick(movie)}
      className="group relative flex flex-col rounded-xl bg-card border border-border cursor-pointer hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-[2/3] bg-muted relative rounded-t-xl overflow-hidden">
        {poster ? (
          <img
            src={poster}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
        {movie.wildcard && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
            Wildcard
          </span>
        )}
        {user && (
          <button
            onClick={toggleHeart}
            aria-label={liked ? "Remove from favourites" : "Add to favourites"}
            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/70 opacity-0 group-hover:opacity-100"
          >
            <HeartIcon filled={liked} className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-3 flex flex-col gap-0.5 flex-1">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{movie.title}</p>
        <p className="text-xs text-muted-foreground">{year}</p>
        {reason && (
          <p className="text-[11px] text-accent mt-1 line-clamp-2 leading-snug">{reason}</p>
        )}
      </div>
    </div>
  );
}