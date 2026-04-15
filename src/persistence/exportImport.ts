import type { Tournament } from "../types";

export function exportToJson(tournament: Tournament): string {
  return JSON.stringify(tournament, null, 2);
}

export function parseImportedJson(json: string): Tournament {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Ongeldig JSON");
  }

  const t = parsed as Record<string, unknown>;
  if (!t || typeof t !== "object") throw new Error("Ongeldige toernooigegevens");
  if (typeof t.id !== "string") throw new Error("Ontbrekend veld: id");
  if (typeof t.name !== "string") throw new Error("Ontbrekend veld: name");
  if (typeof t.date !== "string") throw new Error("Ontbrekend veld: date");
  if (!t.config || typeof t.config !== "object")
    throw new Error("Ontbrekend veld: config");
  if (!Array.isArray(t.competitions) || t.competitions.length !== 2)
    throw new Error("Ontbrekend veld: competitions");

  return parsed as Tournament;
}

export function downloadFile(
  content: string,
  filename: string,
  type: string
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
