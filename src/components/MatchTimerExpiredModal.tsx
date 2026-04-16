import { useEffect } from "react";
import type { UseMatchTimerResult } from "../hooks/useMatchTimer";

interface Props {
  timer: UseMatchTimerResult;
}

export default function MatchTimerExpiredModal({ timer }: Props) {
  const { modalOpen, dismissModal, snoozeTwoMinutes, startNextSlot } = timer;

  useEffect(() => {
    if (!modalOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismissModal();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalOpen, dismissModal]);

  if (!modalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40"
      onClick={dismissModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="timer-expired-title"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismissModal}
          aria-label="Venster sluiten"
          className="absolute right-4 top-4 text-ink-muted hover:text-ink"
        >
          ✕
        </button>
        <h3 id="timer-expired-title" className="mb-2 text-lg font-bold text-ink">
          Tijd!
        </h3>
        <p className="mb-6 text-sm text-ink-soft">De matchtimer is afgelopen.</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={snoozeTwoMinutes}
            className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            +2 min
          </button>
          <button
            type="button"
            onClick={dismissModal}
            className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Sluiten
          </button>
          <button
            type="button"
            onClick={startNextSlot}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
          >
            Volgende slot starten
          </button>
        </div>
      </div>
    </div>
  );
}
