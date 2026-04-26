"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
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

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

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

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((currentYear) => currentYear - 1);
      return;
    }

    setMonth((currentMonth) => currentMonth - 1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((currentYear) => currentYear + 1);
      return;
    }

    setMonth((currentMonth) => currentMonth + 1);
  };

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const visibleMonthTaskCount = useMemo(
    () =>
      cells.reduce<number>((count, day) => {
        if (day === null) {
          return count;
        }

        const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
        return count + (tasksByDate.get(dateStr)?.length ?? 0);
      }, 0),
    [cells, month, tasksByDate, year],
  );

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
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="bg-muted/50 px-1 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {name}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} className="min-h-[80px] bg-background" />;
          }

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayTasks = tasksByDate.get(dateStr) ?? [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={cn(
                "flex min-h-[80px] flex-col gap-0.5 bg-background p-1",
                isToday && "bg-primary/5",
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

              {dayTasks.slice(0, 3).map((task) => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full truncate rounded bg-primary/10 px-1 py-0.5 text-left text-xs text-primary transition-colors hover:bg-primary/20"
                  title={task.name}
                >
                  {task.name}
                </button>
              ))}

              {dayTasks.length > 3 && (
                <span className="px-1 text-xs text-muted-foreground">
                  +{dayTasks.length - 3} more
                </span>
              )}
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
