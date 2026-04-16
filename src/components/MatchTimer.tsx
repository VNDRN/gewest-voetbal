import { useEffect, useRef, useState } from "react";
import type { UseMatchTimerResult } from "../hooks/useMatchTimer";

interface MatchTimerProps {
  timer: UseMatchTimerResult;
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function MatchTimer({ timer }: MatchTimerProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isRunning = timer.status === "running";
  const isPaused = timer.status === "paused";
  const isExpired = timer.status === "expired";
  const canEdit = timer.status === "idle";
  const display = formatMMSS(timer.remainingSeconds);
  const minutesLabel = Math.max(1, Math.round(timer.durationSeconds / 60));

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit() {
    if (!canEdit) return;
    setDraft(String(minutesLabel));
    setEditing(true);
  }

  function commitEdit() {
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 1) timer.editMinutes(n);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function handlePlayClick() {
    switch (timer.status) {
      case "idle":
        timer.start();
        break;
      case "paused":
        timer.resume();
        break;
      case "running":
        timer.pause();
        break;
      case "expired":
        timer.startNextSlot();
        break;
    }
  }

  const playLabel = isRunning
    ? "Timer pauzeren"
    : isPaused
    ? "Timer hervatten"
    : "Timer starten";

  const digitsLabel = canEdit
    ? `Timerduur bewerken, huidige duur ${minutesLabel} minuten`
    : `Resterende tijd ${display}`;

  return (
    <div
      className="inline-flex overflow-hidden rounded-lg border border-hair bg-card text-sm font-semibold text-ink"
      role="group"
      aria-label="Match timer"
    >
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={120}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            else if (e.key === "Escape") cancelEdit();
          }}
          aria-label="Timerduur in minuten"
          className="w-[5.5rem] border-r border-hair bg-card px-3 py-2 text-center font-mono text-base font-extrabold tabular-nums focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          disabled={!canEdit}
          aria-label={digitsLabel}
          className={`w-[5.5rem] border-r border-hair px-3 py-2 text-center font-mono text-base font-extrabold tabular-nums ${
            isExpired ? "text-brand" : "text-ink"
          } ${canEdit ? "hover:bg-surface" : "cursor-default"}`}
        >
          {display}
        </button>
      )}

      <button
        type="button"
        onClick={handlePlayClick}
        aria-label={playLabel}
        className="flex items-center border-r border-hair px-3 py-2 text-ink-soft hover:bg-surface"
      >
        {isRunning ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <button
        type="button"
        onClick={timer.reset}
        aria-label={`Timer resetten naar ${minutesLabel} minuten`}
        className="flex items-center px-3 py-2 text-ink-soft hover:bg-surface"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      </button>
    </div>
  );
}
