import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-semibold text-gold mb-2">Venn</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold mb-2">Reset password</h2>
          {sent ? (
            <div className="text-sm text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-3 mt-4">
              Check your email for a password reset link.
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send a reset link.</p>
              {error && <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
              <form onSubmit={submit} className="flex flex-col gap-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <button type="submit" disabled={loading}
                  className="bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link to="/login" className="text-accent hover:underline">Back to login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
