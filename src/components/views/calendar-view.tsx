"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  /**
   * Fired when a task is dragged from one day to another. The date string is
   * `YYYY-MM-DD`; the parent is responsible for preserving the task's original
   * time-of-day component when persisting the new `due_date`.
   */
  onTaskReschedule?: (taskId: string, newDate: string) => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// How close to the left/right edge (in px) the cursor must be, while dragging,
// to start flipping months. Min 64px, scaled to 14% of calendar width.
const EDGE_RATIO = 0.14;
const EDGE_MIN_PX = 64;
// Dwell before the first flip, then the repeat cadence while held at an edge.
const EDGE_FIRST_DELAY_MS = 500;
const EDGE_REPEAT_MS = 800;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function CalendarView({ tasks, onTaskClick, onTaskReschedule }: CalendarViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  // Mirror year/month into refs so the long-lived edge-flip timer and the drop
  // handler always read the freshest visible month, even across re-renders.
  const yearRef = useRef(year);
  const monthRef = useRef(month);
  useEffect(() => {
    yearRef.current = year;
    monthRef.current = month;
  }, [year, month]);

  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const isDraggingRef = useRef(false);

  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of tasks) {
      if (!task.due_date || task.is_completed) {
        continue;
      }

      const key = task.due_date.split("T")[0];
      const list = map.get(key) ?? [];

      list.push(task);
      list.sort((left, right) => {
        if (right.smart_priority !== left.smart_priority) {
          return right.smart_priority - left.smart_priority;
        }

        return left.name.localeCompare(right.name);
      });

      map.set(key, list);
    }

    return map;
  }, [tasks]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Shift the visible month by `delta`, rolling the year over. Refs are updated
  // synchronously so rapid edge-timer ticks (before a re-render lands) compound
  // correctly instead of repeatedly applying the same starting month.
  const shiftMonth = (delta: number) => {
    let m = monthRef.current + delta;
    let y = yearRef.current;
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    while (m > 11) {
      m -= 12;
      y += 1;
    }
    monthRef.current = m;
    yearRef.current = y;
    setMonth(m);
    setYear(y);
  };

  const prevMonth = () => shiftMonth(-1);
  const nextMonth = () => shiftMonth(1);

  const visibleMonthTaskCount = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => i + 1).reduce<number>((count, day) => {
        const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
        return count + (tasksByDate.get(dateStr)?.length ?? 0);
      }, 0),
    [daysInMonth, month, tasksByDate, year],
  );

  // --- Edge-advance month flipping ---
  // Dragging toward the left edge steps to the previous month; the right edge
  // steps to the next month. Native HTML5 drag data lives on the drag event
  // (not the React tree), so flipping the month mid-drag is safe: the dragged
  // task's source pill can unmount and the drop still fires on release.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const edgeTimerRef = useRef<number | null>(null);
  const edgeDirRef = useRef<"prev" | "next" | null>(null);

  const clearEdge = () => {
    if (edgeTimerRef.current !== null) {
      window.clearTimeout(edgeTimerRef.current);
      edgeTimerRef.current = null;
    }
    edgeDirRef.current = null;
  };

  const startEdge = (dir: "prev" | "next") => {
    if (edgeDirRef.current === dir) {
      return;
    }
    clearEdge();
    edgeDirRef.current = dir;
    const tick = () => {
      if (dir === "next") {
        nextMonth();
      } else {
        prevMonth();
      }
      edgeTimerRef.current = window.setTimeout(tick, EDGE_REPEAT_MS);
    };
    edgeTimerRef.current = window.setTimeout(tick, EDGE_FIRST_DELAY_MS);
  };

  // Evaluate cursor position against the grid edges on every dragover.
  const handleGridDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }
    const grid = gridRef.current;
    if (!grid) {
      return;
    }
    const rect = grid.getBoundingClientRect();
    const threshold = Math.max(EDGE_MIN_PX, rect.width * EDGE_RATIO);
    const x = event.clientX;
    if (x <= rect.left + threshold) {
      startEdge("prev");
    } else if (x >= rect.right - threshold) {
      startEdge("next");
    } else {
      clearEdge();
    }
  };

  useEffect(() => {
    return () => clearEdge();
  }, []);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    isDraggingRef.current = true;
    event.dataTransfer.setData("text/plain", taskId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setDragOverDay(null);
    clearEdge();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, day: number) => {
    event.preventDefault();
    clearEdge();
    setDragOverDay(null);
    const taskId = event.dataTransfer.getData("text/plain");
    if (!taskId) {
      return;
    }
    // yearRef/monthRef hold the current visible month after any edge flips.
    const targetDate = `${yearRef.current}-${pad(monthRef.current + 1)}-${pad(day)}`;
    onTaskReschedule?.(taskId, targetDate);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={nextMonth} aria-label="Next month">
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div
        ref={gridRef}
        onDragOver={handleGridDragOver}
        className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border"
      >
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="bg-muted/50 px-1 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {name}
          </div>
        ))}

        {/* Blank cells for the weekday offset before day 1. */}
        {Array.from({ length: firstDayOfWeek }, (_, i) => (
          <div key={`blank-${i}`} className="min-h-[80px] bg-background" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayTasks = tasksByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;
          const isDragOver = dragOverDay === day;

          return (
            <div
              key={dateStr}
              onDragOver={(event) => {
                // Permit dropping onto this day.
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragOverDay !== day) {
                  setDragOverDay(day);
                }
              }}
              onDrop={(event) => handleDrop(event, day)}
              className={cn(
                "flex max-h-[180px] min-h-[80px] flex-col gap-0.5 overflow-y-auto bg-background p-1 transition-colors",
                isToday && "bg-primary/5",
                isDragOver && "bg-primary/10 ring-2 ring-primary/40 ring-inset",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 flex h-5 w-5 self-start rounded-full text-xs font-medium",
                  "items-center justify-center",
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {day}
              </span>

              {dayTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(event) => handleDragStart(event, task.id)}
                  onDragEnd={handleDragEnd}
                  role="button"
                  tabIndex={0}
                  onClick={() => onTaskClick?.(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onTaskClick?.(task);
                    }
                  }}
                  className="w-full shrink-0 cursor-grab truncate rounded bg-primary/10 px-1 py-0.5 text-left text-xs text-primary transition-colors hover:bg-primary/20 active:cursor-grabbing"
                  title={task.name}
                >
                  {task.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {visibleMonthTaskCount === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No tasks with due dates this month.
        </p>
      )}
    </div>
  );
}
