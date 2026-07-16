---
title: "a11y: improve accessible name on a dashboard control"
labels: ["kind: feature", "good first issue", "area: app", "help wanted"]
---

## Context
Some icon-only buttons in the dashboard shell lack clear `aria-label`s.

## Expected result
Pick one control in `src/components/layout/` or `src/components/dashboard/`, add a concise label, keep visual design unchanged.

## Test
- Keyboard focus still works; label is non-empty in the component.
