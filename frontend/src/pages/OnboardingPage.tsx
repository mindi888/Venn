import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Movie } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const DUMMY_FILMS: Movie[] = [
  { id: 238,   title: "The Godfather",                                          poster_path: "/3bhkrj58Vtu7enYsLlegkAoVJ1L.jpg", release_date: "1972-03-14", genres: ["Crime","Drama"],          runtime: 175, vote_average: 9.2, overview: null, tagline: null, cast: [], director: "Francis Ford Coppola" },
  { id: 278,   title: "The Shawshank Redemption",                               poster_path: "/lyQBXAf8xmHy5edy4mQtMQuFdAx.jpg", release_date: "1994-09-23", genres: ["Drama"],                  runtime: 142, vote_average: 9.3, overview: null, tagline: null, cast: [], director: "Frank Darabont" },
  { id: 155,   title: "The Dark Knight",                                        poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", release_date: "2008-07-14", genres: ["Action","Crime","Drama"], runtime: 152, vote_average: 9.0, overview: null, tagline: null, cast: [], director: "Christopher Nolan" },
  { id: 680,   title: "Pulp Fiction",                                           poster_path: "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg", release_date: "1994-09-10", genres: ["Thriller","Crime"],       runtime: 154, vote_average: 8.9, overview: null, tagline: null, cast: [], director: "Quentin Tarantino" },
  { id: 424,   title: "Schindler's List",                                       poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg", release_date: "1993-11-30", genres: ["History","Drama","War"],  runtime: 195, vote_average: 9.0, overview: null, tagline: null, cast: [], director: "Steven Spielberg" },
  { id: 122,   title: "The Lord of the Rings: The Return of the King",          poster_path: "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg", release_date: "2003-12-17", genres: ["Adventure","Fantasy"],    runtime: 201, vote_average: 9.0, overview: null, tagline: null, cast: [], director: "Peter Jackson" },
  { id: 389,   title: "12 Angry Men",                                           poster_path: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg", release_date: "1957-04-10", genres: ["Drama"],                  runtime: 96,  vote_average: 9.0, overview: null, tagline: null, cast: [], director: "Sidney Lumet" },
  { id: 429,   title: "The Good, the Bad and the Ugly",                         poster_path: "/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg", release_date: "1966-12-23", genres: ["Western"],                runtime: 178, vote_average: 8.8, overview: null, tagline: null, cast: [], director: "Sergio Leone" },
  { id: 550,   title: "Fight Club",                                             poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", release_date: "1999-10-15", genres: ["Drama","Thriller"],       runtime: 139, vote_average: 8.8, overview: null, tagline: null, cast: [], director: "David Fincher" },
  { id: 13,    title: "Forrest Gump",                                           poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg", release_date: "1994-07-06", genres: ["Comedy","Drama","Romance"],runtime: 142, vote_average: 8.8, overview: null, tagline: null, cast: [], director: "Robert Zemeckis" },
];

const TMDB_IMG = "https://image.tmdb.org/t/p/w185"; // dummy films mode

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Movie[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");

  const results = query.trim()
    ? DUMMY_FILMS.filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  const search = (q: string) => setQuery(q);

  const toggle = (m: Movie) => {
    setSelected(prev =>
      prev.find(p => p.id === m.id)
        ? prev.filter(p => p.id !== m.id)
        : prev.length < 10 ? [...prev, m] : prev
    );
  };

  const finish = async () => {
    if (selected.length < 5) return;
    setFinishing(true);
    setFinishError("");
    try {
      // Get the session directly in case user context hasn't loaded yet
      const { data: { session } } = await supabase.auth.getSession();
      const uid = user?.id ?? session?.user?.id;
      if (!uid) { setFinishError("Not signed in — please go back and log in."); setFinishing(false); return; }

      const rows = selected.map(m => ({
        user_id: uid,
        movie_id: m.id,
        movie_title: m.title,
        poster_path: m.poster_path,
        liked: true,
        genres: m.genres,
        watched_date: new Date().toISOString().slice(0, 10),
      }));
      await supabase.from("watched_movies").upsert(rows, { onConflict: "user_id,movie_id" });
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", uid);
      await refreshProfile();
      navigate("/dashboard");
    } catch (e: unknown) {
      setFinishError(e instanceof Error ? e.message : "Something went wrong.");
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-semibold text-gold mb-3">
            What films do you love?
          </h1>
          <p className="text-muted-foreground">Pick 5–10 movies you've genuinely enjoyed. We'll build your taste profile from them.</p>
        </div>

        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search for a movie…"
            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring pr-10"
          />
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-20 max-h-80 overflow-y-auto">
              {results.map(m => {
                const isSelected = !!selected.find(s => s.id === m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => { toggle(m); setQuery(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl ${isSelected ? "opacity-50" : ""}`}
                  >
                    {m.poster_path
                      ? <img src={`${TMDB_IMG}${m.poster_path}`} alt="" className="w-8 h-12 object-cover rounded shrink-0" />
                      : <div className="w-8 h-12 bg-muted rounded shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground">{m.release_date?.slice(0,4)}</p>
                    </div>
                    {isSelected && <span className="ml-auto text-primary text-lg">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="mb-8">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">{selected.length}/10 selected</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {selected.map(m => (
                <button key={m.id} onClick={() => toggle(m)} className="group relative rounded-lg overflow-hidden aspect-[2/3] bg-muted">
                  {m.poster_path
                    ? <img src={`${TMDB_IMG}${m.poster_path}`} alt={m.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] text-center p-1 text-muted-foreground">{m.title}</div>}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-lg">✕</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {finishError && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-3">{finishError}</p>
        )}
        <button
          onClick={finish}
          disabled={selected.length < 5 || finishing}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {finishing ? "Building your profile…" : selected.length < 5 ? `Select ${5 - selected.length} more` : "Build my taste profile →"}
        </button>
      </div>
    </div>
  );
}
