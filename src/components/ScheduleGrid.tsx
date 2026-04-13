import { useMemo, useState, Fragment } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDndSensors } from "../hooks/useDndSensors";
import {
  classifyTargets,
  changeFromDragEnd,
  type Change,
  type KnockoutRoundInfo,
  type TargetClass,
} from "../engine/scheduleMove";
import { formatTime } from "../engine/time";
import type { ScheduleBreak } from "../types";

type ScheduledMatch = {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  fieldIndex: number;
  timeSlot: number;
  score: { home: number; away: number } | null;
  phase: "group" | "knockout";
  competitionId: string;
  groupName: string;
  homeSourceDescription?: string;
  awaySourceDescription?: string;
};

export type MatchPillVariant = "heren" | "dames";

export type MatchMeta = {
  pillLabel: string;
  rightEyebrow: string;
  pillVariant: MatchPillVariant;
};

// eslint-disable-next-line react-refresh/only-export-components
export function scheduledMatchMeta(match: ScheduledMatch): MatchMeta {
  const pillVariant: MatchPillVariant =
    match.competitionId === "womens" ? "dames" : "heren";
  const competitionLabel = pillVariant === "dames" ? "Dames" : "Heren";

  if (match.phase === "knockout") {
    return {
      pillLabel: competitionLabel,
      rightEyebrow: match.groupName,
      pillVariant,
    };
  }

  const groupShort = match.groupName.split(" ").pop() ?? match.groupName;
  return {
    pillLabel: `${competitionLabel} · ${groupShort}`,
    rightEyebrow: "Groep",
    pillVariant,
  };
}

function DraggableCard({
  id,
  canDrag,
  children,
}: {
  id: string;
  canDrag: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    disabled: !canDrag,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function DroppableCell({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

function InsertStrip({
  atSlot,
  fieldCount,
  targetMap,
  overId,
  active,
}: {
  atSlot: number;
  fieldCount: number;
  targetMap: Map<string, TargetClass>;
  overId: string | null;
  active: boolean;
}) {
  if (!active) return null;
  const fields = Array.from({ length: fieldCount }, (_, f) => f);
  return (
    <tr>
      <td className="border-0 p-0 text-right pr-2">
        <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/55">
          + Tijdslot
        </span>
      </td>
      {fields.map((f) => {
        const id = `insert-${atSlot}-${f}`;
        const cls = targetMap.get(id);
        const isInvalid = cls === "invalid";
        const isValid = cls === "valid-insert";
        const isOver = overId === id;
        const base = "border-0 p-1";
        return (
          <td key={f} className={base}>
            <InsertSlot
              id={id}
              invalid={isInvalid}
              valid={isValid}
              hovered={isOver}
            />
          </td>
        );
      })}
    </tr>
  );
}

function InsertSlot({
  id,
  invalid,
  valid,
  hovered,
}: {
  id: string;
  invalid: boolean;
  valid: boolean;
  hovered: boolean;
}) {
  const { setNodeRef } = useDroppable({ id });
  let cls =
    "rounded-md border-2 border-dashed transition-all ";
  if (hovered && valid) {
    cls += "h-20 bg-ink/10 border-ink flex items-center justify-center font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink";
  } else if (hovered && invalid) {
    cls += "h-20 bg-brand/10 border-brand flex items-center justify-center font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand";
  } else if (invalid) {
    cls += "h-5 bg-brand/5 border-brand/45";
  } else {
    cls += "h-5 bg-ink/5 border-ink/40";
  }
  return (
    <div ref={setNodeRef} className={cls}>
      {hovered && valid && "+ Nieuw tijdslot"}
      {hovered && invalid && "× Niet toegestaan"}
    </div>
  );
}

function ActionChip({ kind }: { kind: "move" | "swap" | "insert" | "reject" }) {
  const bg = kind === "reject" ? "bg-brand" : "bg-ink";
  return (
    <div
      className={`absolute -top-3 -right-3 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg ring-2 ring-card ${bg}`}
      style={{ transform: "rotate(2.5deg)" }}
    >
      {kind === "move" && (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path fill="currentColor" d="M10 2 L14 2 L14 10 L17.5 10 L12 16 L6.5 10 L10 10 Z" />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 13 V19 A2 2 0 0 0 6 21 H18 A2 2 0 0 0 20 19 V13"
          />
        </svg>
      )}
      {kind === "swap" && (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 7h11M14 3l4 4-4 4" />
          <path d="M17 17H6M10 21l-4-4 4-4" />
        </svg>
      )}
      {kind === "insert" && (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
      {kind === "reject" && (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
    </div>
  );
}

function OverlayCard({
  match,
  teamNames,
  chip,
}: {
  match: ScheduledMatch;
  teamNames: Map<string, string>;
  chip: "move" | "swap" | "insert" | "reject" | null;
}) {
  const meta = scheduledMatchMeta(match);
  const pillClass =
    meta.pillVariant === "dames"
      ? "bg-brand/8 text-brand"
      : "bg-ink/15 text-ink";
  const homeName = match.homeTeamId
    ? (teamNames.get(match.homeTeamId) ?? "?")
    : (match.homeSourceDescription ?? "TBD");
  const awayName = match.awayTeamId
    ? (teamNames.get(match.awayTeamId) ?? "?")
    : (match.awaySourceDescription ?? "TBD");
  return (
    <div
      className="relative w-[280px] rounded-lg border border-card-hair bg-card p-3 shadow-2xl"
      style={{ transform: "rotate(-2.5deg)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded px-1.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] ${pillClass}`}>
          {meta.pillLabel}
        </span>
        <span className="text-[11px] font-medium text-ink-muted">
          {meta.rightEyebrow}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="truncate text-right text-[16px] font-semibold text-ink">
          {homeName}
        </span>
        <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted">
          VS
        </span>
        <span className="truncate text-left text-[16px] font-semibold text-ink">
          {awayName}
        </span>
      </div>
      {chip && <ActionChip kind={chip} />}
    </div>
  );
}

function cellStateClass(cls: TargetClass | undefined): string {
  switch (cls) {
    case "valid-move":
      return "rounded-md border border-dashed border-ink/40 bg-ink/5";
    case "valid-swap":
      return "ring-2 ring-ink rounded-md";
    case "invalid":
      return "rounded-md border border-dashed border-brand/45 bg-brand/5 opacity-60";
    default:
      return "";
  }
}

type Filter = "all" | "mens" | "womens";

type Props = {
  matches: ScheduledMatch[];
  allMatches: ScheduledMatch[];
  knockoutRoundInfos: KnockoutRoundInfo[];
  filter: Filter;
  fieldCount: number;
  startTime: string;
  slotDurationMinutes: number;
  breaks: ScheduleBreak[];
  teamNames: Map<string, string>;
  onMatchClick: (match: ScheduledMatch) => void;
  onAddBreak: (afterTimeSlot: number) => void;
  onUpdateBreak: (breakId: string, durationMinutes: number) => void;
  onRemoveBreak: (breakId: string) => void;
  onApplyChange: (change: Change) => void;
};

export default function ScheduleGrid({
  matches,
  allMatches,
  knockoutRoundInfos,
  filter,
  fieldCount,
  startTime,
  slotDurationMinutes,
  breaks,
  teamNames,
  onMatchClick,
  onAddBreak,
  onUpdateBreak,
  onRemoveBreak,
  onApplyChange,
}: Props) {
  const maxSlot = matches.reduce((max, m) => Math.max(max, m.timeSlot), 0);
  const slots = Array.from({ length: maxSlot + 1 }, (_, i) => i);

  const filteredGrid = new Map<string, ScheduledMatch>();
  for (const m of matches) filteredGrid.set(`${m.timeSlot}-${m.fieldIndex}`, m);
  const fullGrid = new Map<string, ScheduledMatch>();
  for (const m of allMatches) fullGrid.set(`${m.timeSlot}-${m.fieldIndex}`, m);

  const breakMap = new Map<number, ScheduleBreak>();
  for (const b of breaks) {
    breakMap.set(b.afterTimeSlot, b);
  }

  const sensors = useDndSensors();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [targetMap, setTargetMap] = useState<Map<string, TargetClass>>(new Map());
  const [overId, setOverId] = useState<string | null>(null);

  const activeMatch = useMemo(
    () => (activeId ? allMatches.find((m) => m.id === activeId) ?? null : null),
    [activeId, allMatches]
  );

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    setTargetMap(
      classifyTargets(allMatches, id, fieldCount, breaks, {
        rounds: knockoutRoundInfos,
      })
    );
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active;
    const over = event.over;
    setActiveId(null);
    setTargetMap(new Map());
    setOverId(null);
    if (!over) return;
    const change = changeFromDragEnd(String(active.id), String(over.id), allMatches);
    if (!change) return;
    const cls = targetMap.get(String(over.id));
    if (cls === "invalid") return;
    onApplyChange(change);
  }

  function handleDragCancel() {
    setActiveId(null);
    setTargetMap(new Map());
    setOverId(null);
  }

  function chipFor(
    ovId: string | null,
    map: Map<string, TargetClass>
  ): "move" | "swap" | "insert" | "reject" | null {
    if (!ovId) return null;
    const cls = map.get(ovId);
    if (cls === "invalid") return "reject";
    if (cls === "valid-move") return "move";
    if (cls === "valid-swap") return "swap";
    if (cls === "valid-insert") return "insert";
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="eyebrow-muted border border-card-hair bg-surface px-3 py-2 text-left text-[11px]">
                Tijd
              </th>
              {Array.from({ length: fieldCount }, (_, i) => (
                <th
                  key={i}
                  className="eyebrow-muted border border-card-hair bg-surface px-3 py-2 text-center text-[11px]"
                >
                  Veld {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, slotIdx) => {
              const schedBreak = breakMap.get(slot);
              const breakStartTime = schedBreak
                ? formatTime(slot + 1, startTime, slotDurationMinutes,
                    breaks.filter((b) => b.id !== schedBreak.id))
                : null;
              const breakEndTime = schedBreak
                ? formatTime(slot + 1, startTime, slotDurationMinutes, breaks)
                : null;

              return (
                <Fragment key={slot}>
                  {slotIdx === 0 && (
                    <InsertStrip
                      atSlot={0}
                      fieldCount={fieldCount}
                      targetMap={targetMap}
                      overId={overId}
                      active={!!activeId}
                    />
                  )}
                  <tr>
                    <td className="border border-card-hair bg-surface px-3 py-2 text-xs font-semibold text-ink-soft tabular-nums whitespace-nowrap">
                      {formatTime(slot, startTime, slotDurationMinutes, breaks)}
                    </td>
                    {Array.from({ length: fieldCount }, (_, field) => {
                      const cellKey = `${slot}-${field}`;
                      const cellId = `cell-${slot}-${field}`;
                      const match = filteredGrid.get(cellKey);
                      const hiddenMatch =
                        !match && filter !== "all"
                          ? fullGrid.get(cellKey)
                          : undefined;
                      const cls = activeId ? targetMap.get(cellId) : undefined;
                      const stateCls = cellStateClass(cls);
                      const isSource = activeId && match?.id === activeId;

                      if (!match && hiddenMatch) {
                        return (
                          <td key={field} className="border border-card-hair p-1">
                            <div
                              className="flex min-h-[96px] items-center justify-center rounded-md border border-card-hair bg-surface text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted"
                              style={{
                                backgroundImage:
                                  "repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in oklab, var(--color-ink) 8%, transparent) 6px 7px)",
                              }}
                            >
                              Andere competitie
                            </div>
                          </td>
                        );
                      }

                      if (!match) {
                        return (
                          <td key={field} className="border border-card-hair p-1">
                            <DroppableCell
                              id={cellId}
                              className={`min-h-[96px] ${stateCls}`}
                            >
                              {cls === "valid-move" && activeId && (
                                <div className="flex h-full min-h-[96px] items-center justify-center text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink/60">
                                  Laat hier vallen
                                </div>
                              )}
                            </DroppableCell>
                          </td>
                        );
                      }

                      const meta = scheduledMatchMeta(match);
                      const isKnockout = match.phase === "knockout";
                      const homeName = match.homeTeamId
                        ? (teamNames.get(match.homeTeamId) ?? "?")
                        : (match.homeSourceDescription ?? "TBD");
                      const awayName = match.awayTeamId
                        ? (teamNames.get(match.awayTeamId) ?? "?")
                        : (match.awaySourceDescription ?? "TBD");
                      const homeIsTbd = !match.homeTeamId;
                      const awayIsTbd = !match.awayTeamId;
                      const isTbdKnockout =
                        isKnockout && (homeIsTbd || awayIsTbd);

                      const pillClass =
                        meta.pillVariant === "dames"
                          ? "bg-brand/8 text-brand"
                          : "bg-ink/15 text-ink";

                      const cardClass = `flex w-full flex-col gap-4 rounded-lg border bg-card p-3 text-left transition-colors ${
                        isTbdKnockout
                          ? "border-dashed border-card-hair"
                          : "border-card-hair"
                      } ${isSource ? "opacity-30 border-dashed border-ink/60" : ""}`;

                      const inner = (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 font-display text-[11px] font-extrabold uppercase tracking-[0.14em] ${pillClass}`}
                            >
                              {meta.pillLabel}
                            </span>
                            <span className="text-[11px] font-medium text-ink-muted">
                              {meta.rightEyebrow}
                            </span>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <span
                              className={`truncate text-right text-[16px] ${
                                homeIsTbd
                                  ? "italic font-medium text-ink-muted"
                                  : "font-semibold text-ink"
                              }`}
                            >
                              {homeName}
                            </span>
                            {match.score ? (
                              <span className="font-display text-[20px] font-black leading-none text-ink tabular-nums whitespace-nowrap">
                                <span>{match.score.home}</span>
                                <span className="mx-[3px] font-medium text-ink-muted">
                                  –
                                </span>
                                <span>{match.score.away}</span>
                              </span>
                            ) : (
                              <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-muted">
                                VS
                              </span>
                            )}
                            <span
                              className={`truncate text-left text-[16px] ${
                                awayIsTbd
                                  ? "italic font-medium text-ink-muted"
                                  : "font-semibold text-ink"
                              }`}
                            >
                              {awayName}
                            </span>
                          </div>
                        </>
                      );

                      const canClick =
                        !isKnockout || (match.homeTeamId && match.awayTeamId);
                      const canDrag = match.score === null;

                      const cardNode = canClick ? (
                        <button
                          onClick={() => onMatchClick(match)}
                          className={`${cardClass} hover:bg-surface w-full`}
                        >
                          {inner}
                        </button>
                      ) : (
                        <div className={cardClass}>{inner}</div>
                      );

                      return (
                        <td key={field} className="border border-card-hair p-1">
                          <DroppableCell id={cellId} className={stateCls}>
                            <DraggableCard
                              id={match.id}
                              canDrag={canDrag}
                            >
                              {cardNode}
                            </DraggableCard>
                          </DroppableCell>
                        </td>
                      );
                    })}
                  </tr>
                  {schedBreak ? (
                    <>
                      <InsertStrip
                        atSlot={slot + 1}
                        fieldCount={fieldCount}
                        targetMap={targetMap}
                        overId={overId}
                        active={!!activeId}
                      />
                      <tr>
                        <td
                          colSpan={fieldCount + 1}
                          className="border border-card-hair p-0"
                        >
                          <div className="flex items-center justify-between border-y-2 border-dashed border-beige bg-beige/20 px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">☕</span>
                              <span className="text-sm font-bold text-ink">
                                Pauze
                              </span>
                              <span className="text-xs text-ink-soft">
                                {breakStartTime} – {breakEndTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                value={schedBreak.durationMinutes}
                                onChange={(e) =>
                                  onUpdateBreak(
                                    schedBreak.id,
                                    Math.max(1, Number(e.target.value))
                                  )
                                }
                                className="w-14 rounded-md border border-beige bg-card px-1.5 py-0.5 text-center text-xs tabular-nums text-ink"
                              />
                              <span className="text-xs text-ink-soft">min</span>
                              <button
                                onClick={() => onRemoveBreak(schedBreak.id)}
                                className="text-sm text-brand opacity-60 hover:opacity-100"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <InsertStrip
                        atSlot={slot + 1}
                        fieldCount={fieldCount}
                        targetMap={targetMap}
                        overId={overId}
                        active={!!activeId}
                      />
                    </>
                  ) : activeId ? (
                    <InsertStrip
                      atSlot={slot + 1}
                      fieldCount={fieldCount}
                      targetMap={targetMap}
                      overId={overId}
                      active
                    />
                  ) : (
                    slotIdx < slots.length - 1 && (
                      <tr className="group/add">
                        <td
                          colSpan={fieldCount + 1}
                          className="border-0 p-0"
                        >
                          <button
                            onClick={() => onAddBreak(slot)}
                            className="flex h-6 w-full cursor-pointer items-center justify-center transition-colors hover:bg-surface"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-card-hair bg-surface text-xs text-ink-muted opacity-0 shadow-sm transition-opacity group-hover/add:opacity-100">
                              +
                            </span>
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <DragOverlay>
        {activeMatch && (
          <OverlayCard
            match={activeMatch}
            teamNames={teamNames}
            chip={chipFor(overId, targetMap)}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export type { ScheduledMatch };
