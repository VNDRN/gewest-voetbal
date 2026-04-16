import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
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
import type { ScheduleBreak, ScheduledMatch } from "../types";
import { ActionChip, type ActionChipKind } from "./ActionChip";
import { GhostCard } from "./GhostCard";
import { MatchCardContent } from "./MatchCardContent";
import { previewKindFor } from "../engine/schedulePreview";
import { computeMovers, applyFlip, type Mover } from "../engine/scheduleFlip";

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

const FLIP_DURATION_MS = 250;
const FLIP_EASING = "ease";

type PendingFlip = {
  movers: Mover[];
  oldRects: Map<string, DOMRect>;
};

function DraggableCard({
  id,
  data,
  canDrag,
  refCallback,
  children,
}: {
  id: string;
  data?: Record<string, unknown>;
  canDrag: boolean;
  refCallback?: (el: HTMLElement | null) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    data,
    disabled: !canDrag,
  });
  const cls = canDrag ? "cursor-grab [&_button]:cursor-grab" : "";
  const setRefs = (el: HTMLElement | null) => {
    setNodeRef(el);
    refCallback?.(el);
  };
  return (
    <div
      ref={setRefs}
      data-schedule-drag-root=""
      className={cls}
      {...attributes}
      {...listeners}
    >
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


function AddRowGutter({
  atSlot,
  fieldCount,
  onAddSlot,
  onAddBreak,
}: {
  atSlot: number;
  fieldCount: number;
  onAddSlot: (atSlot: number) => void;
  onAddBreak: (afterTimeSlot: number) => void;
}) {
  return (
    <tr className="group/add">
      <td colSpan={fieldCount + 1} className="border-0 p-0">
        <div className="flex h-6 w-full items-center justify-center gap-2 opacity-0 transition-opacity group-hover/add:opacity-100">
          <button
            type="button"
            onClick={() => onAddSlot(atSlot)}
            className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-dashed border-ink/40 bg-card px-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-soft shadow-sm hover:border-ink hover:text-ink"
          >
            + Tijdslot
          </button>
          {atSlot > 0 && (
            <button
              type="button"
              onClick={() => onAddBreak(atSlot - 1)}
              className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-dashed border-brand/60 bg-beige/30 px-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand shadow-sm hover:border-brand hover:bg-beige/50"
            >
              + Pauze
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function EmptySlotRow({
  slot,
  fieldCount,
  startTime,
  slotDurationMinutes,
  breaks,
  targetMap,
  overId,
  activeId,
  activeMatch,
  teamNames,
  onRemoveSlot,
}: {
  slot: number;
  fieldCount: number;
  startTime: string;
  slotDurationMinutes: number;
  breaks: ScheduleBreak[];
  targetMap: Map<string, TargetClass>;
  overId: string | null;
  activeId: string | null;
  activeMatch: ScheduledMatch | null;
  teamNames: Map<string, string>;
  onRemoveSlot: (slot: number) => void;
}) {
  return (
    <tr className="group/empty">
      <td
        className="sticky left-0 z-10 bg-surface px-3 py-2 text-xs font-semibold text-ink-soft tabular-nums whitespace-nowrap"
        style={{
          boxShadow:
            "inset -1px 0 0 var(--color-card-hair), inset 0 -1px 0 var(--color-card-hair), inset 1px 0 0 var(--color-card-hair)",
        }}
      >
        <div className="flex items-center justify-end gap-1.5">
          <span>{formatTime(slot, startTime, slotDurationMinutes, breaks)}</span>
          <button
            type="button"
            onClick={() => onRemoveSlot(slot)}
            className="flex h-5 w-5 items-center justify-center rounded text-brand opacity-0 transition-opacity group-hover/empty:opacity-60 hover:opacity-100"
            aria-label="Verwijder tijdslot"
          >
            ✕
          </button>
        </div>
      </td>
      {Array.from({ length: fieldCount }, (_, field) => {
        const cellId = `cell-${slot}-${field}`;
        const cls = activeId ? targetMap.get(cellId) : undefined;
        const stateCls = cellStateClass(cls, overId === cellId);
        const preview = activeMatch
          ? previewKindFor(cellId, activeMatch, overId, targetMap, [])
          : { kind: "default" as const };
        return (
          <td key={field} className="border border-card-hair p-1">
            <DroppableCell
              id={cellId}
              className={`flex min-h-[96px] items-center justify-center rounded-md border border-dashed border-card-hair bg-ink/[0.03] text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-muted ${stateCls}`}
            >
              {preview.kind === "target-self-ghost" ? (
                <GhostCard
                  match={preview.match}
                  teamNames={teamNames}
                  chipKind="move"
                />
              ) : (
                <span>Veld {field + 1}</span>
              )}
            </DroppableCell>
          </td>
        );
      })}
    </tr>
  );
}

function OverlayCard({
  match,
  teamNames,
  chip,
}: {
  match: ScheduledMatch;
  teamNames: Map<string, string>;
  chip: ActionChipKind | null;
}) {
  return (
    <div
      className="relative flex w-[280px] flex-col gap-4 rounded-lg border border-card-hair bg-card p-3 shadow-2xl"
      style={{ transform: "rotate(-2.5deg) scale(0.92)" }}
    >
      <MatchCardContent match={match} teamNames={teamNames} showScore={false} />
      {chip && <ActionChip kind={chip} />}
    </div>
  );
}

function cellStateClass(cls: TargetClass | undefined, isHovered: boolean): string {
  switch (cls) {
    case "valid-move":
      return isHovered ? "rounded-md" : "rounded-md bg-ink/5";
    case "valid-swap":
      return isHovered
        ? "ring-2 ring-ink/50 rounded-md bg-blue-50"
        : "rounded-md outline outline-1 outline-ink/20 bg-blue-50/40";
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
  slotCount: number;
  onMatchClick: (match: ScheduledMatch) => void;
  onAddSlot: (atSlot: number) => void;
  onRemoveSlot: (slot: number) => void;
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
  slotCount,
  onMatchClick,
  onAddSlot,
  onRemoveSlot,
  onAddBreak,
  onUpdateBreak,
  onRemoveBreak,
  onApplyChange,
}: Props) {
  const slots = Array.from({ length: slotCount }, (_, i) => i);

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
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null);
  const [targetMap, setTargetMap] = useState<Map<string, TargetClass>>(new Map());
  const [overId, setOverId] = useState<string | null>(null);
  const [pendingFlip, setPendingFlip] = useState<PendingFlip | null>(null);

  const matchRefs = useRef(new Map<string, HTMLElement>());
  const registerMatchRef = useCallback((key: string, el: HTMLElement | null) => {
    if (el) matchRefs.current.set(key, el);
    else matchRefs.current.delete(key);
  }, []);

  const activeMatch = useMemo(
    () =>
      activeId
        ? allMatches.find(
            (m) =>
              m.id === activeId &&
              (activeCompetitionId == null || m.competitionId === activeCompetitionId)
          ) ?? null
        : null,
    [activeId, activeCompetitionId, allMatches]
  );

  useEffect(() => {
    if (!activeId) return;
    document.body.classList.add("is-dragging");
    return () => {
      document.body.classList.remove("is-dragging");
    };
  }, [activeId]);

  useLayoutEffect(() => {
    if (!pendingFlip) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingFlip(null);
      return;
    }
    applyFlip(
      pendingFlip.movers,
      pendingFlip.oldRects,
      matchRefs.current,
      FLIP_DURATION_MS,
      FLIP_EASING
    );
    setPendingFlip(null);
  }, [pendingFlip]);

  function handleDragStart(event: DragStartEvent) {
    for (const el of matchRefs.current.values()) {
      el.style.transition = "";
      el.style.transform = "";
    }
    // Draggable id is `${competitionId}:${matchId}` — parse to avoid dnd-kit id-map collisions
    // when both competitions share the same match id (e.g. ko-1).
    const compositeId = event.active.id as string;
    const colonIdx = compositeId.indexOf(":");
    const compId = colonIdx >= 0 ? compositeId.slice(0, colonIdx) : undefined;
    const id = colonIdx >= 0 ? compositeId.slice(colonIdx + 1) : compositeId;
    setActiveId(id);
    setActiveCompetitionId(compId ?? null);
    setTargetMap(
      classifyTargets(allMatches, id, fieldCount, { rounds: knockoutRoundInfos }, compId)
    );
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active;
    const over = event.over;
    const compositeId = String(active.id);
    const colonIdx = compositeId.indexOf(":");
    const compId = colonIdx >= 0 ? compositeId.slice(0, colonIdx) : undefined;
    const matchId = colonIdx >= 0 ? compositeId.slice(colonIdx + 1) : compositeId;

    let nextPendingFlip: PendingFlip | null = null;
    if (over) {
      const change = changeFromDragEnd(matchId, String(over.id), allMatches, compId);
      const cls = targetMap.get(String(over.id));
      if (change && cls !== "invalid") {
        const movers = computeMovers(change);
        const oldRects = new Map<string, DOMRect>();
        for (const { key } of movers) {
          const el = matchRefs.current.get(key);
          if (el) oldRects.set(key, el.getBoundingClientRect());
        }
        nextPendingFlip = { movers, oldRects };
        onApplyChange(change);
      }
    }

    setActiveId(null);
    setActiveCompetitionId(null);
    setTargetMap(new Map());
    setOverId(null);
    setPendingFlip(nextPendingFlip);
  }

  function handleDragCancel() {
    setActiveId(null);
    setActiveCompetitionId(null);
    setTargetMap(new Map());
    setOverId(null);
  }

  function chipFor(
    ovId: string | null,
    map: Map<string, TargetClass>
  ): ActionChipKind | null {
    if (!ovId) return null;
    const cls = map.get(ovId);
    if (cls === "invalid") return "reject";
    if (cls === "valid-move") return "move";
    if (cls === "valid-swap") return "swap";
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="max-h-[calc(100dvh-12rem)] overflow-auto overscroll-contain">
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: `calc(88px + ${fieldCount} * 240px)` }}
        >
          <colgroup>
            <col style={{ width: "88px" }} />
            {Array.from({ length: fieldCount }, (_, i) => (
              <col key={i} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                className="eyebrow-muted sticky left-0 top-0 z-30 bg-surface px-3 py-2 text-left text-[11px]"
                style={{
                  boxShadow:
                    "inset -1px 0 0 var(--color-card-hair), inset 0 -1px 0 var(--color-card-hair), inset 1px 0 0 var(--color-card-hair), inset 0 1px 0 var(--color-card-hair)",
                }}
              >
                Tijd
              </th>
              {Array.from({ length: fieldCount }, (_, i) => (
                <th
                  key={i}
                  className="eyebrow-muted sticky top-0 z-20 bg-surface px-3 py-2 text-center text-[11px]"
                  style={{
                    boxShadow:
                      "inset -1px 0 0 var(--color-card-hair), inset 0 -1px 0 var(--color-card-hair), inset 0 1px 0 var(--color-card-hair)",
                  }}
                >
                  Veld {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AddRowGutter
              atSlot={0}
              fieldCount={fieldCount}
              onAddSlot={onAddSlot}
              onAddBreak={onAddBreak}
            />
            {slots.map((slot) => {
              const schedBreak = breakMap.get(slot);
              const breakStartTime = schedBreak
                ? formatTime(slot + 1, startTime, slotDurationMinutes,
                    breaks.filter((b) => b.id !== schedBreak.id))
                : null;
              const breakEndTime = schedBreak
                ? formatTime(slot + 1, startTime, slotDurationMinutes, breaks)
                : null;

              const hasMatch = Array.from({ length: fieldCount }, (_, f) => f).some(
                (field) => filteredGrid.has(`${slot}-${field}`) || fullGrid.has(`${slot}-${field}`)
              );

              return (
                <Fragment key={slot}>
                  {hasMatch ? (
                    <tr>
                      <td
                        className="sticky left-0 z-10 bg-surface px-3 py-2 text-xs font-semibold text-ink-soft tabular-nums whitespace-nowrap"
                        style={{
                          boxShadow:
                            "inset -1px 0 0 var(--color-card-hair), inset 0 -1px 0 var(--color-card-hair), inset 1px 0 0 var(--color-card-hair)",
                        }}
                      >
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
                        const stateCls = cellStateClass(cls, overId === cellId);
                        const isSource = activeId && match?.id === activeId && match?.competitionId === activeMatch?.competitionId;
                        const preview = activeMatch
                          ? previewKindFor(cellId, activeMatch, overId, targetMap, allMatches)
                          : { kind: "default" as const };

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

                        if (preview.kind === "source-partner-ghost") {
                          return (
                            <td key={field} className="border border-card-hair p-1">
                              <DroppableCell id={cellId} className="">
                                <GhostCard match={preview.match} teamNames={teamNames} />
                              </DroppableCell>
                            </td>
                          );
                        }

                        if (!match) {
                          return (
                            <td key={field} className="border border-card-hair p-1">
                              <DroppableCell id={cellId} className={`min-h-[96px] ${stateCls}`}>
                                {preview.kind === "target-self-ghost" && (
                                  <GhostCard
                                    match={preview.match}
                                    teamNames={teamNames}
                                    chipKind="move"
                                  />
                                )}
                              </DroppableCell>
                            </td>
                          );
                        }

                        const isKnockout = match.phase === "knockout";
                        const homeIsTbd = !match.homeTeamId;
                        const awayIsTbd = !match.awayTeamId;
                        const isTbdKnockout =
                          isKnockout && (homeIsTbd || awayIsTbd);

                        const cardClass = `flex w-full flex-col gap-4 rounded-lg border bg-card p-3 text-left transition-colors ${
                          isTbdKnockout
                            ? "border-dashed border-card-hair"
                            : "border-card-hair"
                        } ${isSource ? "opacity-30 border-dashed border-ink/60" : ""}`;

                        const inner = (
                          <MatchCardContent match={match} teamNames={teamNames} />
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
                              {preview.kind === "target-self-ghost" && preview.hideOccupant ? (
                                <GhostCard
                                  match={preview.match}
                                  teamNames={teamNames}
                                  chipKind="swap"
                                />
                              ) : (
                                <DraggableCard
                                  id={`${match.competitionId}:${match.id}`}
                                  data={{ competitionId: match.competitionId }}
                                  canDrag={canDrag}
                                  refCallback={(el) =>
                                    registerMatchRef(`${match.competitionId}:${match.id}`, el)
                                  }
                                >
                                  {cardNode}
                                </DraggableCard>
                              )}
                            </DroppableCell>
                          </td>
                        );
                      })}
                    </tr>
                  ) : (
                    <EmptySlotRow
                      slot={slot}
                      fieldCount={fieldCount}
                      startTime={startTime}
                      slotDurationMinutes={slotDurationMinutes}
                      breaks={breaks}
                      targetMap={targetMap}
                      overId={overId}
                      activeId={activeId}
                      activeMatch={activeMatch}
                      teamNames={teamNames}
                      onRemoveSlot={onRemoveSlot}
                    />
                  )}
                  {schedBreak && (
                    <>
                      <AddRowGutter
                        atSlot={slot + 1}
                        fieldCount={fieldCount}
                        onAddSlot={onAddSlot}
                        onAddBreak={onAddBreak}
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
                    </>
                  )}
                  <AddRowGutter
                    atSlot={slot + 1}
                    fieldCount={fieldCount}
                    onAddSlot={onAddSlot}
                    onAddBreak={onAddBreak}
                  />
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

