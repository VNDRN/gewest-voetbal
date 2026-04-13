type Props = {
  activeId: string;
  onChange: (id: string) => void;
};

const COMPETITIONS = [
  { id: "mens", label: "Heren" },
  { id: "womens", label: "Dames" },
] as const;

export default function CompetitionToggle({ activeId, onChange }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-surface p-1">
      {COMPETITIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
            activeId === id
              ? "bg-card text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
