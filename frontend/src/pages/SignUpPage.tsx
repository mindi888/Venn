import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    setLoading(true);
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }
    setLoading(false);
    navigate("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-gold mb-2 font-semibold" style={{fontFamily:"'Ranchers', sans-serif", fontSize:"48px", lineHeight:"50px"}}>Venn</h1>
          <p className="text-muted-foreground" style={{fontSize:"18px", lineHeight:"20px"}}>Venn your tastes overlap</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">Create account</h2>
          {error && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-red-300 uppercase tracking-wider mb-1.5 block">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="filmfan42"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-red-300 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••"
                className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="submit" disabled={loading}
              className="bg-red-600 text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60 mt-1">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-green-400 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
