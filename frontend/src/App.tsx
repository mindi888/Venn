import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";
import NavBar from "@/components/NavBar";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoginPage from "@/pages/LoginPage";
import SignUpPage from "@/pages/SignUpPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import OnboardingPage from "@/pages/OnboardingPage";
import DashboardPage from "@/pages/DashboardPage";
import SearchPage from "@/pages/SearchPage";
import WatchedPage from "@/pages/WatchedPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import type { ReactNode } from "react";



function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DashboardSkeleton() {
  return (
    <div className="pb-16">
      <div className="pt-32 pb-20 px-4 text-center">
        <div className="h-4 w-40 bg-card rounded mx-auto mb-4 animate-pulse" />
        <div className="h-14 w-48 bg-card rounded mx-auto mb-3 animate-pulse" />
        <div className="h-5 w-32 bg-card rounded mx-auto animate-pulse" />
      </div>
      <div className="px-4 max-w-7xl mx-auto">
        <div className="h-6 w-40 bg-card rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Renders a skeleton that already resembles the real page layout, instead of
// blanking the screen to solid black. 
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardSkeleton />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border mt-20 py-10 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-display text-sm text-gold font-semibold text-foreground">Venn</span>
          <span>When your tastes overlap</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p>Movie data provided by <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-gold transition-colors font-medium">TMDB</a></p>
          <p>Movie posters provided by <a href="https://www.imdb.com" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-gold transition-colors font-medium">IMDb</a></p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-1">
          <span>&copy; {new Date().getFullYear()} Venn. All rights reserved.</span>
          <span>Built for film lovers.</span>
        </div>
      </div>
    </footer>
  );
}

function AppRoutes() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
        <Route path="/signup" element={<AuthRoute><SignUpPage /></AuthRoute>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
        <Route path="/watched" element={<ProtectedRoute><WatchedPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Footer />
    </>
  );
}

function SetupScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-4xl font-semibold text-primary mb-3">Venn</h1>
        <div className="bg-card border border-border rounded-2xl p-8 mt-6">
          <p className="text-2xl mb-4">🔌</p>
          <h2 className="text-lg font-semibold mb-2">Supabase not connected</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Add your Supabase credentials to get started. Set the following environment variables in your project:
          </p>
          <div className="bg-muted rounded-lg px-4 py-3 text-left text-xs font-mono text-foreground/80 space-y-1">
            <p>VITE_SUPABASE_URL=https://…</p>
            <p>VITE_SUPABASE_ANON_KEY=eyJ…</p>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Optionally set <span className="font-mono">VITE_API_URL</span> for the recommendation backend (defaults to <span className="font-mono">http://localhost:8000</span>).
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!supabaseConfigured) return <SetupScreen />;
  return (
    <ErrorBoundary>
      <HashRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}