import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTournament, useTournamentDispatch } from "../context/TournamentContext";
import {
  exportToJson,
  parseImportedJson,
  downloadFile,
} from "../persistence/exportImport";
import { useRef, useState, useCallback, useEffect } from "react";
import { clearState } from "../persistence/localStorage";
import HelpButton from "./HelpButton";
import { helpContent, isHelpRoute } from "../content/helpContent";

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
  const location = useLocation();
  const helpEntry = isHelpRoute(location.pathname)
    ? helpContent[location.pathname]
    : undefined;

  function handleSave() {
    const json = exportToJson(tournament);
    downloadFile(json, `${tournament.name}.json`, "application/json");
  }

  function handleLoad() {
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

  function handleSaveAndClose() {
    handleSave();
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
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink">
              <img
                src="/rat.svg"
                alt="Gewest Sante Me Ratje"
                className="h-9 w-9 object-contain"
              />
            </div>
            <h1 className="display text-2xl text-ink">{tournament.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 4v12" />
                <path d="M7 11l5 5 5-5" />
                <path d="M5 20h14" />
              </svg>
              Opslaan
            </button>
            <button
              onClick={handleLoad}
              className="flex items-center gap-2 rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 20V8" />
                <path d="M7 13l5-5 5 5" />
                <path d="M5 4h14" />
              </svg>
              Laden
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
          <div className="mx-auto flex max-w-7xl items-center gap-1 px-6">
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
            {helpEntry && <HelpButton entry={helpEntry} />}
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
              type="button"
              onClick={closeResetModal}
              aria-label="Sluiten"
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
                onClick={handleSaveAndClose}
                className="rounded-lg border border-hair bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
              >
                Sla eerst op
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
