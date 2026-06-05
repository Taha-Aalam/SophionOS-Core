import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from "date-fns";

/**
 * Supported recurrence cycles for a task.
 *
 * - `days` / `weeks` / `months` / `years` — straight date arithmetic.
 * - `months_first_weekday` / `months_last_weekday` — first/last Monday-Friday
 *   of the *target* month (i.e. the month reached after `repeatEvery` months).
 * - `months_second_saturday` — the second calendar Saturday in the target
 *   month.
 * - `months_last_day` — the last calendar day of the target month.
 */
export const TASK_REPEAT_CYCLE = {
  DAYS: "days",
  WEEKS: "weeks",
  MONTHS: "months",
  YEARS: "years",
  MONTHS_FIRST_WEEKDAY: "months_first_weekday",
  MONTHS_LAST_WEEKDAY: "months_last_weekday",
  MONTHS_SECOND_SATURDAY: "months_second_saturday",
  MONTHS_LAST_DAY: "months_last_day",
} as const;

export type TaskRepeatCycle = (typeof TASK_REPEAT_CYCLE)[keyof typeof TASK_REPEAT_CYCLE];

/** Stable list of cycles for UI selectors. */
export const TASK_REPEAT_CYCLE_OPTIONS: ReadonlyArray<{
  value: TaskRepeatCycle;
  label: string;
}> = [
  { value: TASK_REPEAT_CYCLE.DAYS, label: "Day(s)" },
  { value: TASK_REPEAT_CYCLE.WEEKS, label: "Week(s)" },
  { value: TASK_REPEAT_CYCLE.MONTHS, label: "Month(s)" },
  { value: TASK_REPEAT_CYCLE.YEARS, label: "Year(s)" },
  { value: TASK_REPEAT_CYCLE.MONTHS_FIRST_WEEKDAY, label: "Month — first weekday" },
  { value: TASK_REPEAT_CYCLE.MONTHS_LAST_WEEKDAY, label: "Month — last weekday" },
  { value: TASK_REPEAT_CYCLE.MONTHS_SECOND_SATURDAY, label: "Month — second Saturday" },
  { value: TASK_REPEAT_CYCLE.MONTHS_LAST_DAY, label: "Month — last day" },
];

const ISO_DATE_FORMAT = "yyyy-MM-dd";

function parseIsoDate(value: string): Date {
  // `yyyy-MM-dd` is parsed as local time by `new Date`, which matches the
  // semantics the rest of the app uses for due dates (calendar dates, not
  // timestamps).
  return new Date(`${value}T00:00:00`);
}

function formatIsoDate(value: Date): string {
  return format(value, ISO_DATE_FORMAT);
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function findFirstWeekdayInMonth(monthAnchor: Date): Date {
  const days = eachDayOfInterval({
    start: startOfMonth(monthAnchor),
    end: endOfMonth(monthAnchor),
  });
  const first = days.find((d) => isWeekday(d));
  if (!first) {
    // Defensive: a month always has at least one weekday.
    return startOfMonth(monthAnchor);
  }
  return first;
}

function findLastWeekdayInMonth(monthAnchor: Date): Date {
  const days = eachDayOfInterval({
    start: startOfMonth(monthAnchor),
    end: endOfMonth(monthAnchor),
  });
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i];
    if (day && isWeekday(day)) return day;
  }
  return endOfMonth(monthAnchor);
}

function findSecondSaturdayInMonth(monthAnchor: Date): Date {
  const days = eachDayOfInterval({
    start: startOfMonth(monthAnchor),
    end: endOfMonth(monthAnchor),
  });
  let saturdays = 0;
  for (const day of days) {
    if (day.getDay() === 6) {
      saturdays += 1;
      if (saturdays === 2) return day;
    }
  }
  // Fallback: a month that doesn't reach 2 Saturdays shouldn't be reachable
  // for any real calendar month. Return the last day to keep the function
  // total and avoid a NaN downstream.
  return endOfMonth(monthAnchor);
}

/**
 * Computes the next due date for a recurring task.
 *
 * The caller is responsible for ensuring the source task is recurring and
 * has a `due_date` — this function does not validate those invariants.
 *
 * @param dueDate      ISO `YYYY-MM-DD` string for the *current* occurrence.
 * @param repeatEvery  Positive integer interval. `2` + `WEEKS` = biweekly.
 * @param repeatCycle  One of the values in `TASK_REPEAT_CYCLE`.
 * @returns            ISO `YYYY-MM-DD` string for the *next* occurrence.
 */
export function computeNextTaskDueDate(
  dueDate: string,
  repeatEvery: number,
  repeatCycle: TaskRepeatCycle,
): string {
  if (!Number.isInteger(repeatEvery) || repeatEvery < 1) {
    throw new Error("repeatEvery must be a positive integer");
  }

  const anchor = parseIsoDate(dueDate);

  switch (repeatCycle) {
    case TASK_REPEAT_CYCLE.DAYS:
      return formatIsoDate(addDays(anchor, repeatEvery));
    case TASK_REPEAT_CYCLE.WEEKS:
      return formatIsoDate(addWeeks(anchor, repeatEvery));
    case TASK_REPEAT_CYCLE.MONTHS:
      return formatIsoDate(addMonths(anchor, repeatEvery));
    case TASK_REPEAT_CYCLE.YEARS:
      return formatIsoDate(addYears(anchor, repeatEvery));
    case TASK_REPEAT_CYCLE.MONTHS_FIRST_WEEKDAY:
    case TASK_REPEAT_CYCLE.MONTHS_LAST_WEEKDAY:
    case TASK_REPEAT_CYCLE.MONTHS_SECOND_SATURDAY:
    case TASK_REPEAT_CYCLE.MONTHS_LAST_DAY: {
      const targetMonth = addMonths(anchor, repeatEvery);
      switch (repeatCycle) {
        case TASK_REPEAT_CYCLE.MONTHS_FIRST_WEEKDAY:
          return formatIsoDate(findFirstWeekdayInMonth(targetMonth));
        case TASK_REPEAT_CYCLE.MONTHS_LAST_WEEKDAY:
          return formatIsoDate(findLastWeekdayInMonth(targetMonth));
        case TASK_REPEAT_CYCLE.MONTHS_SECOND_SATURDAY:
          return formatIsoDate(findSecondSaturdayInMonth(targetMonth));
        case TASK_REPEAT_CYCLE.MONTHS_LAST_DAY:
          return formatIsoDate(endOfMonth(targetMonth));
      }
    }
  }
}
