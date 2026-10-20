import { useState, useEffect, useCallback, useRef } from "react";
import { loadLottieScript } from "@/lib/lottie";
import { useBackendStatus } from "@/lib/backendStatus";

import loadingDiagramData from "./assets/loading-animation.json";

const LOADING_MESSAGES = [
  { afterSeconds: 0, text: "Grabbing your seat..." },
  { afterSeconds: 5, text: "Dimming the lights..." },
  { afterSeconds: 12, text: "Waking up the projectionist — first visit can take up to 30s..." },
  { afterSeconds: 25, text: "Still loading movies, thanks for waiting..." },
  { afterSeconds: 40, text: "Almost showtime..." },
];

function getMessage(elapsed: number) {
  let message = LOADING_MESSAGES[0].text;
  for (const m of LOADING_MESSAGES) {
    if (elapsed >= m.afterSeconds) message = m.text;
  }
  return message;
}

// Polling itself lives in lib/backendStatus (started at page load); elapsed is
// measured from then, so the messages pick up where the wait actually is
function useBackendWakeup() {
  const { isReady, failed, startedAt } = useBackendStatus();
  const elapsedNow = () => Math.floor((Date.now() - startedAt) / 1000);
  const [elapsed, setElapsed] = useState(elapsedNow);

  useEffect(() => {
    if (isReady) return;
    const tick = setInterval(() => setElapsed(elapsedNow()), 1000);
    return () => clearInterval(tick);
  }, [isReady, startedAt]);

  return { isReady, elapsed, failed };
}

// Wraps only the routes that call the recommendation API
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
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center px-8 text-center bg-background">
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
