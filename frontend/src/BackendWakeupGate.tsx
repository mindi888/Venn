import { useState, useEffect, useCallback, useRef } from "react";
import { loadLottieScript } from "@/lib/lottie";

// Import directly, same pattern as NavBar's venn-logo.json
import loadingDiagramData from "./assets/loading-animation.json"; 

// Adjust to match however you're already reading the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const LOADING_MESSAGES = [
  { afterSeconds: 0, text: "Grabbing your seat..." },
  { afterSeconds: 5, text: "Dimming the lights..." },
  { afterSeconds: 12, text: "Waking up the projectionist — first visit can take up to 30s..." },
  { afterSeconds: 25, text: "Still loading reels, thanks for waiting..." },
  { afterSeconds: 40, text: "Almost showtime..." },
];

function getMessage(elapsed: number) {
  let message = LOADING_MESSAGES[0].text;
  for (const m of LOADING_MESSAGES) {
    if (elapsed >= m.afterSeconds) message = m.text;
  }
  return message;
}

function useBackendWakeup(pollIntervalMs = 3000, maxAttempts = 20) {
  const [isReady, setIsReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);

  // const checkHealth = useCallback(async () => {
  // try {
  // TEMP: force artificial delay to test loading states
  //     await new Promise((r) => setTimeout(r, 8000));
  //     const res = await fetch(`${API_BASE_URL}/health`);
  //     return res.ok;
  //   } catch {
  //     return false;
  //   }
  // }, []);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;
    const startTime = Date.now();

    const tick = setInterval(() => {
      if (!cancelled) setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1;
        const ok = await checkHealth();
        if (ok) {
          if (!cancelled) setIsReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
      if (!cancelled) setFailed(true);
    }

    poll();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [checkHealth, pollIntervalMs, maxAttempts]);

  return { isReady, elapsed, failed };
}

export function BackendWakeupGate({ children }: { children: React.ReactNode }) {
  const { isReady, elapsed, failed } = useBackendWakeup();
  const animRef = useRef<any>(null);

  // Same callback-ref pattern as NavBar's setLogoContainer — fires exactly
  // on mount/unmount of the container div, no useEffect race.
  const setLoaderContainer = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      loadLottieScript().then(() => {
        if (!animRef.current && (window as any).lottie) {
          animRef.current = (window as any).lottie.loadAnimation({
            container: node,
            renderer: "svg",
            loop: true,
            autoplay: true,
            animationData: loadingDiagramData,
          });
        }
      });
    } else {
      animRef.current?.destroy();
      animRef.current = null;
    }
  }, []);

  if (isReady) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center bg-background">
      <div
        ref={setLoaderContainer}
        className="w-24 h-24 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
      />

      <h2 className="font-fun text-2xl text-foreground tracking-wide mt-4 mb-2">
        Venn
      </h2>

      <p className="text-muted-foreground text-sm mb-6 min-h-[1.4em]">
        {getMessage(elapsed)}
      </p>

      <div className="w-56 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(elapsed * 3, 95)}%` }}
        />
      </div>

      {failed && (
        <p className="text-muted-foreground text-xs mt-6">
          Taking longer than usual — the server may be waking up from a long nap.{" "}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 border border-border rounded-md px-3 py-1 text-foreground hover:bg-secondary transition-colors"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
