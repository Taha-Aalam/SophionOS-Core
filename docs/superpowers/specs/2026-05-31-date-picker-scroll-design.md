# Date Picker with Scroll-to-Change-Month — Design

**Date:** 2026-05-31
**Status:** Approved (design phase)

## Problem

Native HTML `<input type="date">` is used for every date field in the app (goal target date, project start/due dates, task due date). The browser-rendered calendar popup does not respond to mouse wheel events — users expect scrolling inside the calendar to change the month (scroll up = previous, scroll down = next), but native pickers ignore wheel input. Behavior is OS/browser controlled and cannot be patched at the app level.

## Affected sites (all 10 reported bugs)

| File | Field |
|---|---|
| `src/components/entities/goal-dialog.tsx` | `target_date` (create + edit) |
| `src/components/entities/project-dialog.tsx` | `start_date`, `due_date` (create + edit) |
| `src/components/entities/task-dialog.tsx` | `due_date` (create + edit) |
| `src/app/(dashboard)/goals/[id]/goal-detail-content.tsx` | `target_date` (inline edit, properties panel) |
| `src/app/(dashboard)/projects/[id]/project-detail-content.tsx` | `due_date` (inline edit, properties panel) |

5 files cover all 10 bug sites because dialogs are shared between create and edit flows.

## Solution

Replace every `<Input type="date">` with a new shared `<DatePicker>` component built on the existing `Popover` (`@base-ui/react`) plus `react-day-picker` for the day grid. The popover content listens for wheel events and changes the displayed month.

## Component contract

`src/components/ui/date-picker.tsx`

```ts
type DatePickerProps = {
  value: string | null            // "YYYY-MM-DD" | null
  onChange: (value: string | null) => void
  min?: string                    // "YYYY-MM-DD"
  max?: string
  disabled?: boolean
  placeholder?: string            // default: "Pick a date"
  id?: string                     // for label htmlFor
  className?: string              // applied to trigger button
  ariaInvalid?: boolean
}
```

- String-in/string-out using ISO `YYYY-MM-DD`. No `Date` objects cross the boundary, so existing zod schemas (`nullableFutureDateSchema`, etc.) and Supabase `date` columns work unchanged.
- Trigger is a `<button>` styled to match `<Input>` (same height, padding, ring, focus state). Displays formatted date or `placeholder` when empty.
- Popover anchors to the trigger via the existing `Popover` / `PopoverTrigger` / `PopoverContent` primitives.
- `min` / `max` disable out-of-range days in the grid.
- `disabled` disables the trigger.
- `ariaInvalid` wires through to the trigger for form-error styling parity with `<Input>`.

## Wheel-to-change-month

- `DayPicker` is used in **controlled-month mode** (`month` + `onMonthChange`) so the wheel handler can drive the displayed month.
- Initial month: derived from `value` if set, else current month.
- `onWheel` attached to `PopoverContent`:
  - `e.preventDefault()` to stop page scroll.
  - `e.deltaY > 0` → next month (`addMonths(month, 1)`).
  - `e.deltaY < 0` → previous month (`addMonths(month, -1)`).
  - Throttle: ignore events arriving <120ms after the last accepted event (trackpad inertia would otherwise burn through several months in one swipe).
- Keyboard arrow navigation (DayPicker default) is preserved.
- Click-to-pick is preserved; selecting a day calls `onChange` and closes the popover.

## RHF integration

Existing dialogs register fields with `form.register("target_date")`, which works because native inputs forward DOM events. The new component is controlled, so dialogs switch to `<Controller>`:

```tsx
<Controller
  control={form.control}
  name="target_date"
  render={({ field }) => (
    <DatePicker
      id="goal-target-date"
      value={field.value ?? null}
      onChange={(v) => field.onChange(v ?? "")}
      min={todayStr}
      ariaInvalid={!!form.formState.errors.target_date}
    />
  )}
/>
```

`?? ""` preserves the existing `z.preprocess((v) => v === "" ? null : v, ...)` behavior in `nullableFutureDateSchema` — empty string round-trips to `null` through the schema as before.

Detail pages already use controlled `value` / `onChange` and call `mutate({ input: { due_date: nextDueDate } })` on change. They become a direct drop-in:

```tsx
<DatePicker
  value={dueDateInput || null}
  onChange={(v) => {
    const next = v ?? "";
    setDueDateInput(next);
    if ((next || null) !== (project.due_date ?? null)) {
      updateProject.mutate({ id: project.id, input: { due_date: next || null } });
    }
  }}
  min={new Date().toISOString().slice(0, 10)}
  className={cn("mt-1 font-medium", dueState.isOverdue && "text-destructive")}
/>
```

## Dependencies

Add to `package.json`:
- `react-day-picker@^9` — headless day-grid component, React 19 compatible, ~12kb gzipped.
- `date-fns@^4` — peer dep used by `react-day-picker` and used internally by `DatePicker` for `format(date, "PP")` and `addMonths(month, n)`.

Both ship ESM and work with the existing Next 16 / React 19 stack.

## Architecture

```
DatePicker (new)
├── Popover            (existing, @base-ui/react)
│   ├── PopoverTrigger → <button> styled like Input
│   └── PopoverContent → onWheel handler
│       └── DayPicker  (react-day-picker)
│           ├── month / onMonthChange  (controlled)
│           ├── selected / onSelect    (controlled)
│           └── disabled               (min/max range)
```

Internal state:
- `month: Date` — currently displayed month, controlled.
- `lastWheelAt: number | null` — throttle reference (instance ref, not React state).

External state: parent owns `value`. The component is fully controlled.

## Edge cases

- **Empty value:** trigger shows `placeholder`. Opening the popover initializes `month` to today.
- **Value out of `min`/`max`:** the value is still rendered in the trigger and the day is selected if visible; the disabled-days predicate prevents re-selection of out-of-range days.
- **Timezone:** all dates are date-only `YYYY-MM-DD` strings, parsed with `parseISO` (treated as local). No UTC conversion. This matches the current native input behavior and the Supabase `date` column semantics.
- **Mobile:** wheel events don't fire on touch. DayPicker's tap-to-select and forward/back month buttons still work. The native mobile keyboard convenience is lost — acceptable tradeoff per design discussion.
- **Form reset:** `Controller`'s `field.value` reflects RHF resets; `<DatePicker>` re-renders with the new `value`.

## Out of scope

- Date range pickers (no current usage in the app).
- Time-of-day selection (all current fields are date-only).
- Locale/i18n beyond default `en-US`.
- Visual redesign — trigger styling matches the existing `<Input>`; no theme tokens added.
- Replacing `<input type="date">` outside the 5 files listed above. Search confirmed those are the only sites.

## Build sequence

1. Add `react-day-picker` and `date-fns` to `package.json`; run `npm install`.
2. Create `src/components/ui/date-picker.tsx` with the `DatePicker` component.
3. Add minimal CSS overrides (or use `react-day-picker`'s class-name API) to match the app's popover styling — neutral border, hover/selected states using existing `bg-accent` / `bg-primary` tokens.
4. Swap the 5 files listed in the affected-sites table:
   - Dialogs (`goal-dialog`, `project-dialog`, `task-dialog`): replace `<Input type="date" {...register(...)}>` with `<Controller>` + `<DatePicker>`.
   - Detail pages (`goal-detail-content`, `project-detail-content`): replace `<Input type="date" value={...} onChange={...}>` directly with `<DatePicker>`.
5. Manually verify each of the 10 reported bug sites: open calendar, scroll up → month decreases; scroll down → month increases; click a day → value sets, popover closes.
6. Run `npm run build` and `npm run lint` before committing.

## Testing

Manual verification covers all 10 reported sites (above). No automated test for wheel scrolling — `jsdom` doesn't reliably dispatch synthetic wheel events with the throttling behavior we need, and the value here is the user-facing scroll behavior, which doesn't lend itself to unit testing.

If a regression test is desired later, the throttle math (120ms minimum gap) is the only piece worth isolating into a pure helper.
