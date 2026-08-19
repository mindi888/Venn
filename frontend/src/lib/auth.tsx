import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  // Retry fetching profile a few times — the DB trigger may not have run yet
  const fetchProfile = async (uid: string, attempt = 0): Promise<void> => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) { setProfile(data); return; }
    // Profile not ready yet — retry up to 5 times with backoff
    if (!error && !data && attempt < 5) {
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      return fetchProfile(uid, attempt + 1);
    }
    setProfile(null);
  };

  const refreshProfile = async () => {
    const uid = user?.id;
    if (uid) await fetchProfile(uid);
  };

  useEffect(() => {
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
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
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
