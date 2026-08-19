import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-semibold text-gold mb-2" style={{fontFamily:"'Ranchers', sans-serif", fontSize:"48px"}}>Venn</h1>
          <p className="text-red-300" style={{fontSize:"18px", lineHeight:"20px"}}>When your tastes overlap</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-6">Sign in</h2>
          {error && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-red-300 uppercase tracking-wider mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-red-300 uppercase tracking-wider mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-red-300 hover:text-red-300/80 transition-colors">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            No account yet?{" "}
            <Link to="/signup" className="text-green-400 hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
