import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type Modifier,
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
import { MatchCardContent } from "./MatchCardContent";

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

/** Sync DOM measure before insert strips mount — `event.active.rect.initial` is often null in onDragStart. */
function scheduleDragRootRectBeforeLayout(event: DragStartEvent): {
  top: number;
  left: number;
} | null {
  const e = event.activatorEvent;
  if (!e) return null;
  let x: number | undefined;
  let y: number | undefined;
  if ("clientX" in e && typeof (e as PointerEvent).clientX === "number") {
    x = (e as PointerEvent).clientX;
    y = (e as PointerEvent).clientY;
  } else if ("touches" in e && (e as TouchEvent).touches[0]) {
    const t = (e as TouchEvent).touches[0];
    x = t.clientX;
    y = t.clientY;
  }
  if (x === undefined || y === undefined) return null;
  const hit = document.elementFromPoint(x, y);
  const root = hit?.closest("[data-schedule-drag-root]");
  if (!root) return null;
  const br = root.getBoundingClientRect();
  return { top: br.top, left: br.left };
}

function DraggableCard({
  id,
  data,
  canDrag,
  children,
}: {
  id: string;
  data?: Record<string, unknown>;
  canDrag: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    data,
    disabled: !canDrag,
  });
  const cls = canDrag ? "cursor-grab [&_button]:cursor-grab" : "";
  return (
    <div
      ref={setNodeRef}
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

function InsertStrip({
  atSlot,
  fieldCount,
  targetMap,
  overId,
  active,
  idPrefix = "insert",
}: {
  atSlot: number;
  fieldCount: number;
  targetMap: Map<string, TargetClass>;
  overId: string | null;
  active: boolean;
  idPrefix?: "insert" | "insert-pre";
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
        const id = `${idPrefix}-${atSlot}-${f}`;
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
      style={{ transform: "rotate(-2.5deg)" }}
    >
      <MatchCardContent match={match} teamNames={teamNames} showScore={false} />
      {chip && <ActionChip kind={chip} />}
    </div>
  );
}

function cellStateClass(cls: TargetClass | undefined): string {
  switch (cls) {
    case "valid-move":
      return "rounded-md border border-dashed border-ink/40 bg-ink/5";
    case "valid-swap":
      return "ring-2 ring-ink/50 rounded-md bg-blue-50";
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
  const [activeCompetitionId, setActiveCompetitionId] = useState<string | null>(null);
  const [targetMap, setTargetMap] = useState<Map<string, TargetClass>>(new Map());
  const [overId, setOverId] = useState<string | null>(null);

  // Pre-insert-strip position: sync DOM measure in onDragStart, else dnd-kit rect, else modifier fallback.
  const initialDraggingRectRef = useRef<{ top: number; left: number } | null>(null);

  // Compensates when the source cell moves (insert strips, hover heights, scroll). Baseline should
  // be pre-insert-strip via `scheduleDragRootRectBeforeLayout`; if missing, first `activeNodeRect`.
  const layoutShiftModifier = useCallback<Modifier>(
    ({ activeNodeRect, transform }) => {
      if (!activeNodeRect) return transform;
      if (!initialDraggingRectRef.current) {
        initialDraggingRectRef.current = {
          top: activeNodeRect.top,
          left: activeNodeRect.left,
        };
      }
      const yAdj = activeNodeRect.top - initialDraggingRectRef.current.top;
      const xAdj = activeNodeRect.left - initialDraggingRectRef.current.left;
      return {
        ...transform,
        x: transform.x - xAdj,
        y: transform.y - yAdj,
      };
    },
    []
  );

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

  function handleDragStart(event: DragStartEvent) {
    // Draggable id is `${competitionId}:${matchId}` — parse to avoid dnd-kit id-map collisions
    // when both competitions share the same match id (e.g. ko-1).
    const compositeId = event.active.id as string;
    const colonIdx = compositeId.indexOf(":");
    const compId = colonIdx >= 0 ? compositeId.slice(0, colonIdx) : undefined;
    const id = colonIdx >= 0 ? compositeId.slice(colonIdx + 1) : compositeId;
    const r = event.active.rect.current.initial;
    const preLayout = scheduleDragRootRectBeforeLayout(event);
    initialDraggingRectRef.current =
      preLayout ?? (r ? { top: r.top, left: r.left } : null);
    setActiveId(id);
    setActiveCompetitionId(compId ?? null);
    setTargetMap(
      classifyTargets(allMatches, id, fieldCount, breaks, { rounds: knockoutRoundInfos }, compId)
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
    setActiveId(null);
    setActiveCompetitionId(null);
    setTargetMap(new Map());
    setOverId(null);
    initialDraggingRectRef.current = null;
    if (!over) return;
    const change = changeFromDragEnd(matchId, String(over.id), allMatches, compId);
    if (!change) return;
    const cls = targetMap.get(String(over.id));
    if (cls === "invalid") return;
    onApplyChange(change);
  }

  function handleDragCancel() {
    setActiveId(null);
    setActiveCompetitionId(null);
    setTargetMap(new Map());
    setOverId(null);
    initialDraggingRectRef.current = null;
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
    if (cls === "valid-insert") return "insert";
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
                      const isSource = activeId && match?.id === activeId && match?.competitionId === activeMatch?.competitionId;

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
                            <DraggableCard
                              id={`${match.competitionId}:${match.id}`}
                              data={{ competitionId: match.competitionId }}
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
                        idPrefix="insert-pre"
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
      <DragOverlay modifiers={[layoutShiftModifier]}>
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

