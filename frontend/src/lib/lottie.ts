let lottieLoadPromise: Promise<void> | null = null;

export function loadLottieScript() {
  if ((window as any).lottie) return Promise.resolve();
  if (lottieLoadPromise) return lottieLoadPromise;
  lottieLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.13.0/lottie.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return lottieLoadPromise;
}