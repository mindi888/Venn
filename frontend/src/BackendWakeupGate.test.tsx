import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BackendWakeupGate } from "@/BackendWakeupGate";

const backend = vi.hoisted(() => ({
  status: { isReady: false, failed: false, startedAt: 0 },
}));

vi.mock("@/lib/backendStatus", () => ({ useBackendStatus: () => backend.status }));
// The Lottie player loads from a CDN; never resolving keeps it out of the test
vi.mock("@/lib/lottie", () => ({ loadLottieScript: () => new Promise(() => {}) }));

function renderGate() {
  return render(
    <BackendWakeupGate>
      <p>page content</p>
    </BackendWakeupGate>,
  );
}

describe("BackendWakeupGate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    backend.status = { isReady: false, failed: false, startedAt: Date.now() };
  });
  afterEach(() => vi.useRealTimers());

  it("shows the loading screen instead of the page while the backend wakes up", () => {
    renderGate();
    expect(screen.getByText("Grabbing your seat...")).toBeInTheDocument();
    expect(screen.queryByText("page content")).not.toBeInTheDocument();
  });

  it("renders the page once the backend is ready", () => {
    backend.status = { ...backend.status, isReady: true };
    renderGate();
    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.queryByText("Grabbing your seat...")).not.toBeInTheDocument();
  });

  it("advances the message as time passes", () => {
    renderGate();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("Dimming the lights...")).toBeInTheDocument();
  });

  it("counts from page load, not from when the gated page opened", () => {
    // e.g. the user spent 13s on the login page before reaching the dashboard
    backend.status = { ...backend.status, startedAt: Date.now() - 13_000 };
    renderGate();
    expect(screen.getByText(/Waking up the projectionist/)).toBeInTheDocument();
  });

  it("offers a retry once polling has given up", () => {
    backend.status = { ...backend.status, failed: true };
    renderGate();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
