import { NavLink, Outlet } from "react-router-dom";
import { useTournament, useTournamentDispatch } from "../context/TournamentContext";
import {
  exportToJson,
  parseImportedJson,
  downloadFile,
  exportMatchesCsv,
  exportStandingsCsv,
} from "../persistence/exportImport";
import { useRef } from "react";

const NAV_ITEMS = [
  { to: "/setup", label: "Setup" },
  { to: "/groups", label: "Groups" },
  { to: "/schedule", label: "Schedule" },
  { to: "/knockouts", label: "Knockouts" },
] as const;

export default function Layout() {
  const tournament = useTournament();
  const dispatch = useTournamentDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        alert(`Import failed: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{tournament.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
            >
              Export CSV
            </button>
            <button
              onClick={handleImport}
              className="rounded bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600"
            >
              Import
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
    </div>
  );
}
