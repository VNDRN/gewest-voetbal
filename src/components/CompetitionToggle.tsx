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
    <div className="inline-flex rounded-lg bg-gray-200 p-1">
      {COMPETITIONS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeId === id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
