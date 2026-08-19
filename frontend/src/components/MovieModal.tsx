import { useEffect, useState } from "react";


import type { Movie } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import StarRating from "./StarRating";
import MovieCard from "./MovieCard";
import { api } from "@/lib/api";
import { HeartIcon } from "./HeartIcon";

const TMDB_IMG_LG = "https://image.tmdb.org/t/p/w500";

type Props = {
  movie: Movie | null;
  onClose: () => void;
};

export default function MovieModal({ movie, onClose }: Props) {
  const { user } = useAuth();
  const [watchedEntry, setWatchedEntry] = useState<{ liked: boolean | null; rating: number | null; review: string | null } | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [similar, setSimilar] = useState<Movie[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarMovie, setSimilarMovie] = useState<Movie | null>(null);

  useEffect(() => {
    if (!movie) return;
    setSimilar([]);
    setWatchedEntry(null);
    setRating(null);
    setLiked(null);
    setReview("");

    if (user) {
      supabase
        .from("watched_movies")
        .select("liked,rating,review")
        .eq("user_id", user.id)
        .eq("movie_id", movie.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setWatchedEntry(data);
            setRating(data.rating);
            setLiked(data.liked);
            setReview(data.review ?? "");
          }
        });
    }

    setSimilarLoading(true);
    api.similar(movie.title).then(setSimilar).catch(() => setSimilar([])).finally(() => setSimilarLoading(false));
  }, [movie?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!movie) return null;

  const poster = movie.poster_path ? `${TMDB_IMG_LG}${movie.poster_path}` : null;
  const year = movie.release_date?.slice(0, 4) ?? "—";
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;

  const saveWatched = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      movie_id: movie.id,
      movie_title: movie.title,
      poster_path: movie.poster_path,
      liked,
      rating,
      review: review || null,
      genres: movie.genres,
      watched_date: new Date().toISOString().slice(0, 10),
    };
    await supabase.from("watched_movies").upsert(payload, { onConflict: "user_id,movie_id" });
    setWatchedEntry({ liked, rating, review: review || null });
    setSaving(false);
  };

  const removeWatched = async () => {
    if (!user) return;
    await supabase.from("watched_movies").delete().eq("user_id", user.id).eq("movie_id", movie.id);
    setWatchedEntry(null);
    setRating(null);
    setLiked(null);
    setReview("");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex flex-col md:flex-row gap-0">
            {/* Poster */}
            <div className="md:w-64 shrink-0">
              <div className="md:h-full aspect-[2/3] md:aspect-auto bg-muted rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden">
                {poster ? (
                  <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center min-h-[280px]">
                    <svg className="w-16 h-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 p-6 flex flex-col gap-4 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-semibold text-foreground leading-tight">{movie.title}</h2>
                  {movie.tagline && <p className="text-sm italic text-muted-foreground mt-1">"{movie.tagline}"</p>}
                </div>
                <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{year}</span>
                {runtime && <><span>·</span><span>{runtime}</span></>}
                {movie.vote_average && <><span>·</span><span className="text-white font-semibold">★ {movie.vote_average.toFixed(1)}</span></>}
              </div>

              {movie.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.map(g => (
                    <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">{g}</span>
                  ))}
                </div>
              )}

              {movie.overview && <p className="text-sm text-foreground/80 leading-relaxed">{movie.overview}</p>}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {Array.isArray(movie.director) && movie.director.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Director(s)</p>
                    <p className="text-foreground">{movie.director.join(", ")}</p>
                  </div>
                )}
                {movie.cast?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cast</p>
                    <p className="text-foreground">{movie.cast.slice(0, 4).join(", ")}</p>
                  </div>
                )}
              </div>

              {movie.reason && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-accent">{movie.reason}</p>
                </div>
              )}

              {/* User actions */}
              {user && (
                <div className="border-t border-border pt-4 flex flex-col gap-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Your take</p>
                  <button
                    onClick={() => setLiked(liked === true ? null : true)}
                    className="flex items-center gap-2 w-fit text-sm transition-colors group"
                    aria-label={liked === true ? "Remove from favourites" : "Add to favourites"}
                  >
                    <HeartIcon filled={liked === true} />
                    <span className={liked === true ? "text-red-400" : "text-muted-foreground group-hover:text-foreground transition-colors"}>
                      {liked === true ? "Favourited" : "Add to favourites"}
                    </span>
                  </button>
                  <StarRating value={rating} onChange={setRating} />
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="Write a quick review... (optional)"
                    rows={2}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveWatched}
                      disabled={saving}
                      className="flex-1 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {saving ? "Saving…" : watchedEntry ? "Update" : "Mark as Watched"}
                    </button>
                    {watchedEntry && (
                      <button onClick={removeWatched} className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Similar movies */}
          {(similar.length > 0 || similarLoading) && (
            <div className="border-t border-border p-6">
              <h3 className="font-display text-lg font-semibold text-gold mb-4">Similar Films</h3>
              {similarLoading ? (
                <div className="flex gap-2">{Array.from({length:4}).map((_,i)=><div key={i} className="flex-1 aspect-[2/3] bg-muted rounded-xl animate-pulse"/>)}</div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {similar.slice(0,6).map(m => (
                    <MovieCard key={m.id} movie={m} onClick={setSimilarMovie} reason={m.wildcard ? "Wildcard pick" : `Similar to ${movie.title}`} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {similarMovie && <MovieModal movie={similarMovie} onClose={() => setSimilarMovie(null)} />}
    </>
  );
}
