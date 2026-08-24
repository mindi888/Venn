import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ username, display_name: displayName, bio, avatar_url: avatarUrl }).eq("id", user!.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) { setPassMsg("Password must be at least 6 characters."); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setPassMsg(error ? error.message : "Password updated successfully.");
    setNewPass("");
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    await supabase.from("watched_movies").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="pt-30 pb-16 px-4 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-semibold text-gold mb-8">Settings</h1>

      {/* Profile */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-5">Profile</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Field label="Username" value={username} onChange={setUsername} placeholder="filmfan42" />
          <Field label="Display Name" value={displayName} onChange={setDisplayName} placeholder="Film Fan" />
          <Field label="Avatar URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://…" />
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="A short bio…"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm">
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-sm text-green-400">Saved!</span>}
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-5">Change Password</h2>
        <form onSubmit={changePassword} className="flex flex-col gap-4">
          <Field label="New Password" value={newPass} onChange={setNewPass} type="password" placeholder="••••••••" />
          {passMsg && <p className={`text-sm ${passMsg.includes("success") ? "text-green-400" : "text-red-400"}`}>{passMsg}</p>}
          <button type="submit" className="bg-secondary text-secondary-foreground font-semibold px-5 py-2 rounded-lg hover:bg-muted transition-colors text-sm w-fit border border-border">
            Update password
          </button>
        </form>
      </section>

      {/* Danger */}
      <section className="bg-card border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">Deletes your account, profile, and all watched movies. This cannot be undone.</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="text-sm px-4 py-2 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
            Delete my account
          </button>
        ) : (
          <div className="flex gap-3">
            <button onClick={deleteAccount} disabled={deleting}
              className="text-sm px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60">
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-sm px-4 py-2 border border-border rounded-lg text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
