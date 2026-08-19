import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const links = [
  { to: "/dashboard", label: "Home", icon: "🏠" },
  { to: "/watched", label: "Watched", icon: "🎬" },
  { to: "/profile", label: "Profile", icon: "👤" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export default function NavBar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0 group">
          <img 
            src="/venn-logo.svg" 
            alt="Venn Logo" 
            className="w-18 h-10 object-contain transition-transform group-hover:scale-105" 
          />
        </NavLink>


        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xs hidden md:flex">
          <div className="relative w-full">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search films…"
              className="w-full bg-muted border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm px-3 py-1.5 rounded-lg transition-colors ${isActive ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 ml-2">
          <span className="text-sm text-muted-foreground">{profile?.display_name ?? profile?.username ?? ""}</span>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            Logout
          </button>
        </div>

        <button onClick={() => setMobileOpen(v => !v)} className="md:hidden ml-auto p-2 text-muted-foreground hover:text-foreground">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-t border-border px-4 py-3 flex flex-col gap-1">
          <form onSubmit={handleSearch} className="mb-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search films…"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </form>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `text-sm px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-white/10 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {l.icon} {l.label}
            </NavLink>
          ))}
          <button onClick={logout} className="text-sm px-3 py-2 text-left text-muted-foreground hover:text-foreground">
            🚪 Logout
          </button>
        </div>
      )}
    </header>
  );
}
