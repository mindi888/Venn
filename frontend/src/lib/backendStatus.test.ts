import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// backendStatus keeps module-level state (it polls once per page load), so each
// test imports a fresh copy of it
async function freshModule() {
  vi.resetModules();
  const status = await import("@/lib/backendStatus");
  const { API_BASE } = await import("@/lib/api");
  return { ...status, API_BASE };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("backend wake-up polling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("becomes ready as soon as /health responds ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { startBackendWakeup, useBackendStatus, API_BASE } = await freshModule();

    const { result } = renderHook(() => useBackendStatus());
    expect(result.current.isReady).toBe(false);

    act(() => startBackendWakeup());
    await advance(0);

    expect(result.current.isReady).toBe(true);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${API_BASE}/health`);
  });

  it("retries every 3s while the server is asleep", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch")) // network error
      .mockResolvedValueOnce({ ok: false }) // e.g. 502 while Render spins up
      .mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { startBackendWakeup, useBackendStatus } = await freshModule();
    const { result } = renderHook(() => useBackendStatus());

    act(() => startBackendWakeup());
    await advance(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isReady).toBe(false);

    await advance(3000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.isReady).toBe(false);

    await advance(3000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.isReady).toBe(true);
  });

  it("gives up after 20 attempts and reports failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    const { startBackendWakeup, useBackendStatus } = await freshModule();
    const { result } = renderHook(() => useBackendStatus());

    act(() => startBackendWakeup());
    await advance(20 * 3000);

    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(result.current).toMatchObject({ isReady: false, failed: true });
  });

  it("only polls once even if started repeatedly (e.g. StrictMode double-invoke)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { startBackendWakeup } = await freshModule();

    startBackendWakeup();
    startBackendWakeup();
    await advance(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
