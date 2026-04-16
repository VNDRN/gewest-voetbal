export type ActionChipKind = "move" | "swap" | "reject";

export function ActionChip({
  kind,
  className,
}: {
  kind: ActionChipKind;
  className?: string;
}) {
  const bg = kind === "reject" ? "bg-brand" : "bg-ink";
  return (
    <div
      className={`absolute -top-3 -right-3 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-card ${bg} ${className ?? ""}`}
      style={{ transform: "rotate(2.5deg)" }}
    >
      {kind === "move" && (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path fill="currentColor" d="M10 2 L14 2 L14 10 L17.5 10 L12 16 L6.5 10 L10 10 Z" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 13 V19 A2 2 0 0 0 6 21 H18 A2 2 0 0 0 20 19 V13"
          />
        </svg>
      )}
      {kind === "swap" && (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 7h11M14 3l4 4-4 4" />
          <path d="M17 17H6M10 21l-4-4 4-4" />
        </svg>
      )}
      {kind === "reject" && (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
    </div>
  );
}
