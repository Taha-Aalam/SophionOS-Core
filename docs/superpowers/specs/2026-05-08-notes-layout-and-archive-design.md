# Notes Layout And Archive Design

**Date:** 2026-05-08  
**Status:** Approved

---

## Problem Summary

The Notes index page currently uses a narrow centered layout that leaves a large amount of unused space on the right side, especially compared with the wider table-based presentation already used on the Resources page.

The note archive workflow is also incomplete:

1. There is no clear per-row archive affordance on the Notes index page.
2. The archive control should appear only when the user hovers a row and should live in the far-right action area.
3. The note detail page needs an archive action as well.
4. Archiving from the detail page should keep the user on the same note and swap the action to Restore instead of redirecting away.

---

## User-Approved Decisions

- Keep the existing table layout on the Notes page.
- Expand the Notes page to use the wider content width pattern already seen on the Resources page.
- Show the row-level archive action only on hover.
- Place the hover archive control in the rightmost action space of each note row.
- On the note detail page, keep the user on the same note after archiving and change the action to Restore.

---

## Scope

### Files Expected To Change

| File | Purpose |
|---|---|
| `src/app/(dashboard)/notes/page.tsx` | widen page layout, refine row hover actions, add archive/restore affordance in rightmost action column |
| `src/app/(dashboard)/notes/[id]/page.tsx` | add archive/restore action to header controls and keep interaction in-place |
| `src/lib/hooks/use-notes.ts` | reuse existing archive and restore mutations on the detail page if not already wired there |

No backend or database changes are required because note archiving and restoring already exist.

---

## Notes Index Page

### Layout Change

The page should stop using the narrow centered container:

- current pattern: constrained centered wrapper with a `max-w-4xl`
- target pattern: wider full-content layout aligned with the Resources page

The goal is to preserve the existing page structure while letting the table, tabs, and filters breathe across the available horizontal space.

### Table Behavior

The notes table remains the primary presentation:

- keep the existing columns and selection behavior
- keep row click navigation into the note detail page
- keep the current pin and favorite affordances
- keep archived notes in the archived tab and active notes in their current views

### Hover Archive Action

Each row should expose a dedicated archive control in the far-right action column:

- non-archived row on hover: show `Archive`
- archived row on hover: show `Restore`
- non-hover state: action remains visually hidden or quiet enough that the table still reads cleanly

The archive control should behave like the existing favorite and pin hover affordances:

- clicking the archive control must not trigger row navigation
- the row should remain clickable everywhere else
- the action column should feel aligned with the current action pattern rather than introducing a separate menu

### Visual Goal

This change should make the Notes page feel closer to the Resources page:

- wider content footprint
- less dead space on the right
- action affordances that appear intentional instead of lost in empty layout

---

## Note Detail Page

### Header Action

Add an archive action to the header control cluster near the existing delete action.

Behavior:

- if the note is active, show `Archive`
- if the note is archived, show `Restore`
- clicking the action keeps the user on the same note page
- after mutation success, the visible action swaps immediately to the opposite state

### State Updates

The page should not redirect after archive/restore.

The page should continue rendering the current note and reflect the updated state through the existing query/mutation flow. This includes:

- button label/icon state
- archived tab eligibility on the index page after navigation back
- any status or metadata badges that already derive from the note state

If a local optimistic toggle is needed for responsiveness, it should stay minimal and consistent with the existing detail-page local state patterns.

---

## Error Handling

- If archive fails, remain on the same page and preserve the prior visible state.
- If restore fails, remain on the same page and preserve the prior visible state.
- Existing toast/error handling from note mutations should continue to surface failures.
- Row action clicks on the Notes index page must stop event propagation so accidental navigation does not occur.

---

## Testing Checklist

- [ ] Notes page uses a wider layout and no longer leaves a large blank region on the right
- [ ] Existing tabs, filters, bulk actions, and row navigation still work
- [ ] Hovering an active note reveals an archive action in the far-right action area
- [ ] Hovering an archived note reveals a restore action in the far-right action area
- [ ] Clicking archive or restore on a row does not open the note detail page
- [ ] Pin and favorite hover actions continue to work
- [ ] Note detail page shows archive for active notes
- [ ] Note detail page shows restore for archived notes
- [ ] Archiving from the detail page keeps the user on the same note
- [ ] Restoring from the detail page keeps the user on the same note
- [ ] Returning to the Notes index reflects archived/restored state correctly

---

## Out Of Scope

- Converting the Notes page into cards or a grid layout
- Reworking note filtering logic
- Changing note archive data model or persistence
- Adding new archive confirmation dialogs unless existing behavior already requires one
