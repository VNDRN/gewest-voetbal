import { useCallback, useEffect, useState } from "react";
import type { HelpEntry } from "../content/helpContent";

export default function HelpButton({ entry }: { entry: HelpEntry }) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hulp"
        className="ml-auto flex h-9 w-9 items-center justify-center self-center rounded-full border border-hair text-sm font-bold text-ink-soft transition-colors hover:bg-surface hover:text-ink"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={entry.title}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={close}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Sluiten"
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              ✕
            </button>
            <h3 className="display mb-2 pr-6 text-xl text-ink">{entry.title}</h3>
            <p className="mb-4 text-sm text-ink-soft">{entry.intro}</p>
            <dl className="mb-5 space-y-3">
              {entry.options.map((option) => (
                <div key={option.label}>
                  <dt className="text-sm font-bold text-ink">{option.label}</dt>
                  <dd className="text-sm text-ink-soft">{option.description}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-lg bg-surface p-3 text-sm text-ink">
              <span className="eyebrow-muted mb-1 block">Volgende stap</span>
              {entry.next}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
