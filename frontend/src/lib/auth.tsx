import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, type Profile } from "./supabase";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Tracks which uid we've already fetched (or are currently fetching) so
  // repeated auth events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, and
  // StrictMode's double-invoke in dev) don't each trigger their own fetch.
  const lastFetchedUid = useRef<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  // Retry fetching profile a few times — the DB trigger may not have run yet
  const fetchProfileInner = async (uid: string, attempt = 0): Promise<void> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) { setProfile(data); return; }
    // Profile not ready yet — retry up to 5 times with backoff
    if (!error && !data && attempt < 5) {
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      return fetchProfileInner(uid, attempt + 1);
    }
    setProfile(null);
  };

  // Public entry point: skips the fetch entirely if we already have (or are
  // already fetching) this uid's profile. Pass force=true to bypass the guard
  // (used by refreshProfile, e.g. after onboarding completes).
  const fetchProfile = (uid: string, force = false): Promise<void> => {
    if (!force && lastFetchedUid.current === uid) {
      return inFlight.current ?? Promise.resolve();
    }
    lastFetchedUid.current = uid;
    const p = fetchProfileInner(uid).finally(() => {
      if (inFlight.current === p) inFlight.current = null;
    });
    inFlight.current = p;
    return p;
  };

  const refreshProfile = async () => {
    const uid = user?.id;
    if (uid) await fetchProfile(uid, true);
  };

  useEffect(() => {
    // getSession() resolves faster than waiting on the first
    // onAuthStateChange event, so we keep it to flip `loading` off quickly
    // (avoids the full-screen LoadingScreen lingering). The dedupe guards in
    // fetchProfile() mean this no longer causes a duplicate profile fetch
    // when onAuthStateChange's INITIAL_SESSION event fires right after.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        lastFetchedUid.current = null;
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);