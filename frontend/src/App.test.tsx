import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import App from "@/App";

// Tests the route guards in App.tsx; pages, auth and the backend gate are stubbed
const auth = vi.hoisted(() => ({
  state: { user: null as object | null, profile: null as object | null, loading: false },
}));

vi.mock("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => auth.state,
}));
vi.mock("@/lib/supabase", () => ({ supabaseConfigured: true, supabase: {} }));
vi.mock("@/BackendWakeupGate", () => ({
  BackendWakeupGate: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/NavBar", () => ({ default: () => null }));
vi.mock("@/pages/LoginPage", () => ({ default: () => <p>login page</p> }));
vi.mock("@/pages/SignUpPage", () => ({ default: () => <p>signup page</p> }));
vi.mock("@/pages/ForgotPasswordPage", () => ({ default: () => <p>forgot password page</p> }));
vi.mock("@/pages/OnboardingPage", () => ({ default: () => <p>onboarding page</p> }));
vi.mock("@/pages/DashboardPage", () => ({ default: () => <p>dashboard page</p> }));
vi.mock("@/pages/SearchPage", () => ({ default: () => <p>search page</p> }));
vi.mock("@/pages/WatchedPage", () => ({ default: () => <p>watched page</p> }));
vi.mock("@/pages/ProfilePage", () => ({ default: () => <p>profile page</p> }));
vi.mock("@/pages/SettingsPage", () => ({ default: () => <p>settings page</p> }));

const USER = { id: "u1" };
const ONBOARDED = { onboarding_completed: true };
const NOT_ONBOARDED = { onboarding_completed: false };

function visit(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

describe("route guards", () => {
  beforeEach(() => {
    auth.state = { user: null, profile: null, loading: false };
  });

  it.each(["#/dashboard", "#/search", "#/watched", "#/profile", "#/settings"])(
    "sends logged-out visitors from %s to login",
    (hash) => {
      visit(hash);
      expect(screen.getByText("login page")).toBeInTheDocument();
      expect(window.location.hash).toBe("#/login");
    },
  );

  it.each([
    ["#/signup", "signup page"],
    ["#/forgot-password", "forgot password page"],
  ])("lets logged-out visitors reach %s", (hash, page) => {
    visit(hash);
    expect(screen.getByText(page)).toBeInTheDocument();
  });

  it("sends users who haven't finished onboarding to onboarding", () => {
    auth.state = { user: USER, profile: NOT_ONBOARDED, loading: false };
    visit("#/dashboard");
    expect(screen.getByText("onboarding page")).toBeInTheDocument();
  });

  it("sends logged-in users away from login to the dashboard", () => {
    auth.state = { user: USER, profile: ONBOARDED, loading: false };
    visit("#/login");
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("lets onboarded users into protected pages", () => {
    auth.state = { user: USER, profile: ONBOARDED, loading: false };
    visit("#/watched");
    expect(screen.getByText("watched page")).toBeInTheDocument();
  });

  it("redirects unknown routes to the dashboard", () => {
    auth.state = { user: USER, profile: ONBOARDED, loading: false };
    visit("#/no-such-page");
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("shows a skeleton, not a page or a redirect, while auth is loading", () => {
    auth.state = { user: null, profile: null, loading: true };
    visit("#/dashboard");
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
    expect(screen.queryByText("dashboard page")).not.toBeInTheDocument();
    expect(window.location.hash).toBe("#/dashboard");
  });
});
