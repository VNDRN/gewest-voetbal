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
    <div className="min-h-screen bg-surface">
      <header className="bg-chrome border-b border-hair">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0a0a0a]">
              <img
                src="/SMR.png"
                alt="Gewest Sante Me Ratje"
                className="h-10 w-auto object-contain"
              />
            </div>
            <h1 className="display text-2xl text-ink">{tournament.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportJson}
              className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              Exporteer JSON
            </button>
            <button
              onClick={handleExportCsv}
              className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              Exporteer CSV
            </button>
            <button
              onClick={handleImport}
              className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
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
            <button
              onClick={() => setShowResetModal(true)}
              className="rounded-lg border border-brand/25 bg-transparent px-4 py-2 text-sm font-semibold text-brand hover:border-brand hover:bg-brand/5"
            >
              Reset toernooi
            </button>
          </div>
        </div>
        <nav className="bg-chrome">
          <div className="mx-auto flex max-w-7xl gap-1 px-6">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `-mb-px border-b-[3px] px-4 py-3.5 font-display text-sm font-bold uppercase tracking-widest transition-colors ${
                    isActive
                      ? "border-brand text-ink"
                      : "border-transparent text-ink-soft hover:text-ink"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40"
          onClick={closeResetModal}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeResetModal}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              ✕
            </button>
            <h3 className="mb-2 text-lg font-bold text-ink">
              Toernooi resetten?
            </h3>
            <p className="mb-6 text-sm text-ink-soft">
              Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan
              worden gemaakt.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleExportAndClose}
                className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
              >
                Exporteer eerst
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90"
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
