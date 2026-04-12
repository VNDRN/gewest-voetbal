import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTournament, useTournamentDispatch } from "../context/TournamentContext";
import {
  exportToJson,
  parseImportedJson,
  downloadFile,
  exportMatchesCsv,
  exportStandingsCsv,
} from "../persistence/exportImport";
import { useRef, useState, useCallback, useEffect } from "react";
import { clearState } from "../persistence/localStorage";

const NAV_ITEMS = [
  { to: "/setup", label: "Instellingen" },
  { to: "/groups", label: "Groepen" },
  { to: "/schedule", label: "Schema" },
  { to: "/knockouts", label: "Knock-out" },
] as const;

export default function Layout() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [showResetModal, setShowResetModal] = useState(false);

  function handleExportJson() {
    const json = exportToJson(tournament);
    downloadFile(json, `${tournament.name}.json`, "application/json");
  }

  function handleExportCsv() {
    const matchesCsv = exportMatchesCsv(tournament);
    downloadFile(matchesCsv, `${tournament.name}-matches.csv`, "text/csv");
    const standingsCsv = exportStandingsCsv(tournament);
    downloadFile(standingsCsv, `${tournament.name}-standings.csv`, "text/csv");
  }

  function handleImport() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedJson(reader.result as string);
        dispatch({ type: "SET_TOURNAMENT", tournament: imported });
      } catch (err) {
        alert(`Import mislukt: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    clearState();
    dispatch({ type: "RESET" });
    setShowResetModal(false);
    navigate("/setup");
  }

  function handleExportAndClose() {
    handleExportJson();
    setShowResetModal(false);
  }

  const closeResetModal = useCallback(() => setShowResetModal(false), []);

  useEffect(() => {
    if (!showResetModal) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeResetModal();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showResetModal, closeResetModal]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">{tournament.name}</h1>
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
              >
                Exporteer JSON
              </button>
              <button
                onClick={handleExportCsv}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
              >
                Exporteer CSV
              </button>
              <button
                onClick={handleImport}
                className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
              >
                Importeer
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Reset toernooi
          </button>
        </div>
        <nav className="mx-auto max-w-7xl px-4">
          <div className="flex gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-t px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-gray-900"
                      : "bg-transparent text-gray-300 hover:text-white"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeResetModal}
        >
          <div
            className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeResetModal}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Toernooi resetten?
            </h3>
            <p className="mb-6 text-sm text-gray-500">
              Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan
              worden gemaakt.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleExportAndClose}
                className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
              >
                Exporteer eerst
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Wis alles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
