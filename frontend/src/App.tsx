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

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-display text-lg text-muted-foreground">Venn</p>
      </div>
    </div>
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
