import { useRegisterSW } from "virtual:pwa-register/react";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update();
      }, CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink p-4 text-white shadow-xl"
    >
      <div className="flex-1 text-sm font-semibold">
        Nieuwe versie beschikbaar.
      </div>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-110"
      >
        Vernieuw
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label="Sluit"
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
