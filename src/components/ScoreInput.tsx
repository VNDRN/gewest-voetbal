import { useState, useEffect, useCallback } from "react";
import type { Score } from "../types";

type Props = {
  homeTeam: string;
  awayTeam: string;
  initialScore: Score | null;
  isKnockout?: boolean;
  onSave: (score: Score) => void;
  onClose: () => void;
};

export default function ScoreInput({
  homeTeam,
  awayTeam,
  initialScore,
  isKnockout,
  onSave,
  onClose,
}: Props) {
  const [home, setHome] = useState(initialScore?.home ?? 0);
  const [away, setAway] = useState(initialScore?.away ?? 0);
  const [penHome, setPenHome] = useState(initialScore?.penHome ?? 0);
  const [penAway, setPenAway] = useState(initialScore?.penAway ?? 0);

  const isDraw = isKnockout && home === away;
  const penaltyAlsoDraw = isDraw && penHome === penAway;

  const handleSave = useCallback(() => {
    if (isDraw) {
      onSave({ home, away, penHome, penAway });
    } else {
      onSave({ home, away });
    }
  }, [isDraw, home, away, penHome, penAway, onSave]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !penaltyAlsoDraw) handleSave();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSave, onClose, penaltyAlsoDraw]);

  const handleSetHome = (val: number) => {
    setHome(val);
    if (isKnockout && val !== away) {
      setPenHome(0);
      setPenAway(0);
    }
  };

  const handleSetAway = (val: number) => {
    setAway(val);
    if (isKnockout && home !== val) {
      setPenHome(0);
      setPenAway(0);
    }
  };

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
              onChange={(e) => handleSetHome(Math.max(0, parseInt(e.target.value) || 0))}
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
              onChange={(e) => handleSetAway(Math.max(0, parseInt(e.target.value) || 0))}
              className="h-16 w-20 rounded-lg border-2 border-gray-300 text-center text-3xl font-bold focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        {isDraw && (
          <div className="mt-4 border-t-2 border-dashed border-amber-400 pt-4">
            <div className="mb-2 text-center text-xs font-semibold text-amber-600">
              Strafschoppen
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={penHome}
                  onChange={(e) => setPenHome(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-12 w-16 rounded-lg border-2 border-amber-400 bg-amber-50 text-center text-2xl font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
              <span className="text-xl font-bold text-gray-400">-</span>
              <div className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={penAway}
                  onChange={(e) => setPenAway(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-12 w-16 rounded-lg border-2 border-amber-400 bg-amber-50 text-center text-2xl font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            {penaltyAlsoDraw && (
              <p className="mt-2 text-center text-xs text-red-500">
                Strafschoppen mogen niet gelijk zijn
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={penaltyAlsoDraw}
            className={`rounded-lg px-5 py-2 text-sm font-medium text-white ${
              penaltyAlsoDraw
                ? "cursor-not-allowed bg-blue-300"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
