import { useSyncExternalStore } from "react";
import { API_BASE } from "@/lib/api";

// The Render backend sleeps when idle and can take ~50s to wake. Polling starts
// once at page load (see main.tsx), so it wakes up while the user is on pages
// that don't need it (login, signup, settings) instead of blocking the whole app.

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

type BackendStatus = { isReady: boolean; failed: boolean; startedAt: number };

let status: BackendStatus = { isReady: false, failed: false, startedAt: Date.now() };
let started = false;
const listeners = new Set<() => void>();

function setStatus(patch: Partial<BackendStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export function startBackendWakeup() {
  if (started) return;
  started = true;
  setStatus({ startedAt: Date.now() });

  (async () => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (await checkHealth()) {
        setStatus({ isReady: true });
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    setStatus({ failed: true });
  })();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBackendStatus() {
  return useSyncExternalStore(subscribe, () => status);
}
