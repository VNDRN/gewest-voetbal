import type { Tournament } from "../types";
import { calculateStandings } from "../engine/standings";

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

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatTime(
  timeSlot: number,
  startTime: string,
  slotDurationMinutes: number
): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + timeSlot * slotDurationMinutes;
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function exportMatchesCsv(tournament: Tournament): string {
  const header =
    "Competitie,Fase,Groep,Thuis,Uit,ThuisScore,UitScore,Veld,Tijd";
  const rows: string[] = [header];

  for (const comp of tournament.competitions) {
    const teamMap = new Map(comp.teams.map((t) => [t.id, t.name]));

    for (const group of comp.groups) {
      for (const match of group.matches) {
        rows.push(
          [
            escapeCsv(comp.name),
            match.phase,
            escapeCsv(group.name),
            escapeCsv(teamMap.get(match.homeTeamId) ?? match.homeTeamId),
            escapeCsv(teamMap.get(match.awayTeamId) ?? match.awayTeamId),
            match.score?.home ?? "",
            match.score?.away ?? "",
            match.fieldIndex >= 0 ? match.fieldIndex + 1 : "",
            match.timeSlot >= 0
              ? formatTime(
                  match.timeSlot,
                  tournament.config.startTime,
                  tournament.config.slotDurationMinutes
                )
              : "",
          ].join(",")
        );
      }
    }

    for (const round of comp.knockoutRounds) {
      for (const match of round.matches) {
        rows.push(
          [
            escapeCsv(comp.name),
            match.phase,
            escapeCsv(round.name),
            match.homeTeamId
              ? escapeCsv(teamMap.get(match.homeTeamId) ?? match.homeTeamId)
              : escapeCsv(match.homeSourceDescription),
            match.awayTeamId
              ? escapeCsv(teamMap.get(match.awayTeamId) ?? match.awayTeamId)
              : escapeCsv(match.awaySourceDescription),
            match.score?.home ?? "",
            match.score?.away ?? "",
            match.fieldIndex >= 0 ? match.fieldIndex + 1 : "",
            match.timeSlot >= 0
              ? formatTime(
                  match.timeSlot,
                  tournament.config.startTime,
                  tournament.config.slotDurationMinutes
                )
              : "",
          ].join(",")
        );
      }
    }
  }

  return rows.join("\n");
}

export function exportStandingsCsv(tournament: Tournament): string {
  const header =
    "Competitie,Groep,Positie,Team,GS,W,G,V,DV,DT,DS,Ptn";
  const rows: string[] = [header];

  for (const comp of tournament.competitions) {
    const teamMap = new Map(comp.teams.map((t) => [t.id, t.name]));

    for (const group of comp.groups) {
      const standings = calculateStandings(group.teamIds, group.matches);
      standings.forEach((row, idx) => {
        rows.push(
          [
            escapeCsv(comp.name),
            escapeCsv(group.name),
            idx + 1,
            escapeCsv(teamMap.get(row.teamId) ?? row.teamId),
            row.played,
            row.won,
            row.drawn,
            row.lost,
            row.goalsFor,
            row.goalsAgainst,
            row.goalDifference,
            row.points,
          ].join(",")
        );
      });
    }
  }

  return rows.join("\n");
}
