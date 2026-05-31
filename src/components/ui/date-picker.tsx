"use client";

import * as React from "react";
import { addMonths, format, isValid, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePickerProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  ariaInvalid?: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WHEEL_THROTTLE_MS = 120;

function toIsoString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseIsoOrNull(value: string | null | undefined): Date | null {
  if (!value || !ISO_DATE.test(value)) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder = "Pick a date",
  id,
  className,
  ariaInvalid,
}: DatePickerProps) {
  const selected = parseIsoOrNull(value);
  const minDate = parseIsoOrNull(min ?? null);
  const maxDate = parseIsoOrNull(max ?? null);

  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(() => selected ?? new Date());
  const lastWheelAtRef = React.useRef<number>(0);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        setMonth(parseIsoOrNull(value) ?? new Date());
      }
      setOpen(next);
    },
    [value],
  );

  const handleWheel = React.useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.deltaY === 0) return;
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelAtRef.current < WHEEL_THROTTLE_MS) return;
    lastWheelAtRef.current = now;
    setMonth((prev) => addMonths(prev, event.deltaY > 0 ? 1 : -1));
  }, []);

  const disabledMatcher = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = [];
    if (minDate) matchers.push({ before: minDate });
    if (maxDate) matchers.push({ after: maxDate });
    return matchers.length > 0 ? matchers : undefined;
  }, [minDate, maxDate]);

  const triggerLabel = selected ? format(selected, "PP") : placeholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={ariaInvalid || undefined}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-base text-left transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        onWheel={handleWheel}
      >
        <DayPicker
          mode="single"
          selected={selected ?? undefined}
          onSelect={(day) => {
            if (!day) {
              onChange(null);
              return;
            }
            onChange(toIsoString(day));
            setOpen(false);
          }}
          month={month}
          onMonthChange={setMonth}
          disabled={disabledMatcher}
          showOutsideDays
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left" ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              ),
          }}
          classNames={{
            root: "p-3",
            months: "relative",
            month: "space-y-2",
            month_caption: "flex h-7 items-center justify-center text-sm font-medium",
            nav: "absolute inset-x-0 top-0 flex items-center justify-between",
            button_previous:
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            button_next:
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            month_grid: "w-full border-collapse",
            weekdays: "flex",
            weekday:
              "w-9 text-center text-[0.7rem] font-normal uppercase tracking-wide text-muted-foreground",
            week: "flex w-full mt-1",
            day: "size-9 p-0 text-center align-middle text-sm",
            day_button:
              "inline-flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-selected:opacity-100",
            today: "bg-muted/60 text-foreground",
            selected:
              "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground",
            outside: "text-muted-foreground/40",
            disabled: "text-muted-foreground/30 pointer-events-none",
            hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
