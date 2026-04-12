import { useState, useEffect } from "react";

type Props = {
  homeTeam: string;
  awayTeam: string;
  initialScore: { home: number; away: number } | null;
  onSave: (score: { home: number; away: number }) => void;
  onClose: () => void;
};

export default function ScoreInput({
  homeTeam,
  awayTeam,
  initialScore,
  onSave,
  onClose,
}: Props) {
  const [home, setHome] = useState(initialScore?.home ?? 0);
  const [away, setAway] = useState(initialScore?.away ?? 0);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") onSave({ home, away });
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [home, away, onClose, onSave]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-6 text-center text-lg font-semibold">Score invoeren</h3>
        <div className="flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{homeTeam}</span>
            <input
              type="number"
              min={0}
              value={home}
              onChange={(e) => setHome(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-16 w-20 rounded-lg border-2 border-gray-300 text-center text-3xl font-bold focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <span className="text-2xl font-bold text-gray-400">-</span>
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-gray-600">{awayTeam}</span>
            <input
              type="number"
              min={0}
              value={away}
              onChange={(e) => setAway(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-16 w-20 rounded-lg border-2 border-gray-300 text-center text-3xl font-bold focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            onClick={() => onSave({ home, away })}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
