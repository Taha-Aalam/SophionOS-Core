# Notebooks-as-Tags + Related Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `notebook` from a single per-note string into a multi-valued tag system, and redefine "related notes" as "notes that share a notebook," displayed in one section per notebook.

**Architecture:** Replace the `notes.notebook` column and the `note_related_notes` edge table with a single junction table `note_notebooks(note_id, notebook)`. A note's notebooks become a `string[]`. "Related notes" = a self-join on shared notebook, grouped by notebook name. Every grouping/unlink operation is now a single row insert/delete — no graph traversal, no edge ambiguity.

**Tech Stack:** Next.js (App Router), Supabase (Postgres + RLS), TanStack Query, Zod, shadcn-style UI (`Command`/`Popover`/`Dialog`), Vitest.

---

## Background for the implementer (read first)

You are working in the `notes-workflow-refinement` git worktree of a personal life-OS app. Relevant existing patterns you MUST mirror (do not invent new ones):

- **Junction many-to-many** is done with `note_areas`, `goal_notes`, `note_projects`, `task_notes`. Each has its own migration (see `supabase/migrations/20260503000001_create_note_related_notes.sql` for the RLS shape) and a `replaceXLinks(noteId, ids)` service method (delete-all-then-insert).
- **Reading links onto a note** is done by `hydrateNoteRelations()` in `src/lib/services/note.service.ts`, which chains `hydrateNoteAreaLinks` → `hydrateNoteGoalLinks` → `hydrateNoteProjectLinks` → `hydrateNoteTaskLinks`. Each attaches an array property (e.g. `linkedAreaIds`) to every note.
- **Array input fields** (`area_ids`, `goal_ids`, …) are stripped out of the note row before insert/update by `extractNoteAreaIds`/`extractGoalIds`/etc. in `src/lib/services/note.helpers.ts`, then persisted via the `replaceXLinks` methods.
- **Multi-select UI** follows the `AreaSelector` component inside `src/components/entities/note-metadata-panel.tsx` (a `Popover` + `Command` + `Checkbox` list). Mirror it for notebooks, but add free-text create.

**This plan SUPERSEDES the transitive-component work currently uncommitted in this worktree** (`fetchRelatedComponentEdges`, the rewritten `getRelated`/`getNoteRelatedCounts`, and the two tests added to `tests/unit/note.service.test.ts`). Task 1 removes them.

**Sequencing rule:** the `notes.notebook` column is dropped LAST (Task 13), after all readers/writers move to the junction table, so the app keeps compiling at every phase boundary.

---

## File map

**Migrations (create):**
- `supabase/migrations/20260525000000_create_note_notebooks.sql`
- `supabase/migrations/20260525000001_backfill_note_notebooks.sql`
- `supabase/migrations/20260525000002_drop_note_related_notes.sql`
- `supabase/migrations/20260525000003_drop_notes_notebook_column.sql`

**Types / validators (modify):**
- `src/lib/types/database.types.ts` — add `note_notebooks`, drop `note_related_notes`, drop `notes.notebook`.
- `src/lib/types/domain.types.ts` — `Note.notebook` → `Note.notebooks: string[]`; add `RelatedNotebookGroup`.
- `src/lib/validators/note.schema.ts` — `notebook` → `notebooks: string[]`; rework `bulkUpdateNotebookSchema`.
- `src/lib/services/note.helpers.ts` — add `extractNotebooks`.

**Service (modify):**
- `src/lib/services/note.service.ts` — remove edge code; add junction read/write; rework `listNotebooks`, `getByNotebook`, `getRelated*`, `getNoteRelatedCounts`, `create`, `update`, bulk.

**Hooks (modify):**
- `src/lib/hooks/use-notes.ts` — rework related/notebook hooks.

**UI (modify):**
- `src/components/entities/note-metadata-panel.tsx` — notebook input → tag combobox.
- `src/app/(dashboard)/notes/[id]/note-detail-content.tsx` — per-notebook related sections + link-to-notebook dialog.
- `src/app/(dashboard)/notes/notes-content.tsx` — filter, group-by-notebook, badges, create form.
- `src/components/entities/note-row.tsx` — render multiple notebook badges.
- `src/app/(dashboard)/notes/new/page.tsx` — `?notebook=` seed.
- `src/app/(dashboard)/knowledge/page.tsx` — badge column + create form datalist.

**Queries / SSR hydration (modify):**
- `src/lib/queries/note-detail.queries.ts`, `notes.queries.ts`, `topic-detail.queries.ts`, `area-detail.queries.ts` — hydrate `notebooks` instead of `notebook`.

**Tests (modify):**
- `tests/unit/note.service.test.ts`
- `tests/unit/note-page-display.test.ts`, `note-page-display-badges.test.ts`, `note-detail-metadata.test.ts`
- `src/lib/__tests__/server-query-hydration.test.ts`

---

## Phase 1 — Tear out superseded edge code

### Task 1: Revert the transitive-component work

**Files:**
- Modify: `src/lib/services/note.service.ts`
- Modify: `tests/unit/note.service.test.ts`

- [ ] **Step 1: Delete the `fetchRelatedComponentEdges` helper**

In `src/lib/services/note.service.ts`, remove the entire `fetchRelatedComponentEdges` function (the block starting with the comment `// Related notes form transitive groups:` and ending at its closing `}` before `async function upsertNoteType`).

- [ ] **Step 2: Restore `getRelated` to its pre-session form temporarily**

This method is fully replaced in Task 6; for now just make the file compile by replacing the body with a stub that returns `[]` (it has one caller, updated in Task 7):

```ts
  async getRelated(_userId: string, _noteId: string): Promise<Note[]> {
    return [];
  },
```

- [ ] **Step 3: Remove the two session-added tests**

In `tests/unit/note.service.test.ts`, delete the `it("getRelated returns the whole group, not just direct links", …)` and `it("getNoteRelatedCounts counts the group size, not direct edges", …)` blocks.

- [ ] **Step 4: Verify compile + tests**

Run: `npx tsc --noEmit`
Expected: no output (success).
Run: `npx vitest run tests/unit/note.service.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/note.service.ts tests/unit/note.service.test.ts
git commit -m "refactor: remove transitive related-notes edge logic ahead of notebook-tag model"
```

---

## Phase 2 — Schema

### Task 2: Create the `note_notebooks` junction table

**Files:**
- Create: `supabase/migrations/20260525000000_create_note_notebooks.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Notebooks as tags: many notebooks per note, replacing notes.notebook (single).

CREATE TABLE note_notebooks (
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  notebook TEXT NOT NULL CHECK (char_length(notebook) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, notebook)
);

ALTER TABLE note_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_notebooks_select_own" ON note_notebooks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_notebooks.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "note_notebooks_insert_own" ON note_notebooks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_notebooks.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "note_notebooks_delete_own" ON note_notebooks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_notebooks.note_id AND notes.user_id = auth.uid())
  );

CREATE INDEX idx_note_notebooks_note ON note_notebooks(note_id);
CREATE INDEX idx_note_notebooks_notebook ON note_notebooks(notebook);
```

- [ ] **Step 2: Apply locally**

Run: `npx supabase migration up` (or the project's documented apply command — check `package.json`/README if this errors).
Expected: migration applies without error; `note_notebooks` exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000000_create_note_notebooks.sql
git commit -m "feat: add note_notebooks junction table"
```

### Task 3: Backfill from the existing `notes.notebook` column

**Files:**
- Create: `supabase/migrations/20260525000001_backfill_note_notebooks.sql`

- [ ] **Step 1: Write the backfill**

```sql
-- Copy each note's single notebook string into the junction table.
INSERT INTO note_notebooks (note_id, notebook)
SELECT id, notebook
FROM notes
WHERE notebook IS NOT NULL AND char_length(trim(notebook)) > 0
ON CONFLICT (note_id, notebook) DO NOTHING;
```

- [ ] **Step 2: Apply + verify**

Run: `npx supabase migration up`
Then verify counts match: every note with a non-null notebook now has exactly one `note_notebooks` row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000001_backfill_note_notebooks.sql
git commit -m "feat: backfill note_notebooks from notes.notebook"
```

### Task 4: Drop the obsolete `note_related_notes` table

**Files:**
- Create: `supabase/migrations/20260525000002_drop_note_related_notes.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Related notes are now derived from shared notebooks; the edge table is obsolete.
DROP TABLE IF EXISTS note_related_notes;
```

- [ ] **Step 2: Apply**

Run: `npx supabase migration up`
Expected: table dropped.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260525000002_drop_note_related_notes.sql
git commit -m "feat: drop note_related_notes table"
```

---

## Phase 3 — Types & validators

### Task 5: Update database types, domain types, validators, helpers

**Files:**
- Modify: `src/lib/types/database.types.ts`
- Modify: `src/lib/types/domain.types.ts:181`
- Modify: `src/lib/validators/note.schema.ts`
- Modify: `src/lib/services/note.helpers.ts`

- [ ] **Step 1: database.types.ts — add `note_notebooks`, drop `note_related_notes`**

Remove the entire `note_related_notes: { … }` block (around line 692). Add a sibling table block:

```ts
      note_notebooks: {
        Row: {
          note_id: string;
          notebook: string;
          created_at: string;
        };
        Insert: {
          note_id: string;
          notebook: string;
          created_at?: string;
        };
        Update: {
          note_id?: string;
          notebook?: string;
          created_at?: string;
        };
      };
```

Leave `notes.notebook` in `database.types.ts` for now (dropped in Task 13).

- [ ] **Step 2: domain.types.ts — replace the field**

At `src/lib/types/domain.types.ts:181`, change:

```ts
  notebook?: string | null;
```
to:
```ts
  notebooks?: string[];
```

Then, near the other note-related exported types in the same file, add:

```ts
export interface RelatedNotebookGroup {
  notebook: string;
  notes: Note[];
}
```

- [ ] **Step 3: note.schema.ts — multi-value field**

Replace the `notebook` line in `noteBaseSchema` (line 37):

```ts
    notebook: z.preprocess((v) => (v === "" ? null : v), z.string().max(100).nullable().optional()),
```
with:
```ts
    notebooks: z.array(z.string().min(1).max(100)).default([]),
```

Replace `bulkUpdateNotebookSchema` (lines 76-79) with an add-to-notebook shape:

```ts
export const addNotesToNotebookSchema = z.object({
  noteIds: z.array(z.string().uuid()),
  notebook: z.string().min(1).max(100),
});
```

- [ ] **Step 4: note.helpers.ts — add `extractNotebooks`**

Mirror `extractGoalIds`. Add:

```ts
export function extractNotebooks<T extends { notebooks?: string[] }>(
  input: T,
): { notebooks: string[]; noteInput: Omit<T, "notebooks"> } {
  const { notebooks, ...noteInput } = input;
  const cleaned = Array.from(
    new Set((notebooks ?? []).map((n) => n.trim()).filter((n) => n.length > 0)),
  );
  return { notebooks: cleaned, noteInput };
}
```

- [ ] **Step 5: Verify compile (expect errors only in service/UI, fixed later)**

Run: `npx tsc --noEmit`
Expected: errors ONLY about `notebook` usage in `note.service.ts`, hooks, and UI (these are fixed in later tasks). No errors inside the four files edited here.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/database.types.ts src/lib/types/domain.types.ts src/lib/validators/note.schema.ts src/lib/services/note.helpers.ts
git commit -m "feat: model notebooks as a string array on notes"
```

---

## Phase 4 — Service layer (TDD)

### Task 6: Junction read/write + related-by-notebook in note.service.ts

**Files:**
- Modify: `src/lib/services/note.service.ts`
- Test: `tests/unit/note.service.test.ts`

- [ ] **Step 1: Write failing tests for the new behaviors**

Append to `tests/unit/note.service.test.ts` inside the `describe("noteService", …)` block. These mirror the file's existing single-`client` mock style (chainable `from/select/eq`, terminal `in`/`or`/`delete`).

```ts
  it("getRelatedByNotebook groups co-notebook notes per notebook", async () => {
    // The note under view (n1) is in notebook "Ideas". n2, n3 also in "Ideas".
    const noteN2 = { ...baseNote, id: "n2", name: "N2" };
    const noteN3 = { ...baseNote, id: "n3", name: "N3" };
    const client = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // 1) this note's notebooks; 2) members of "Ideas"; 3+) hydration stubs
      in: vi
        .fn()
        .mockResolvedValueOnce({ data: [noteN2, noteN3], error: null })
        .mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockResolvedValue({ data: [noteN2, noteN3], error: null }),
    } as never;
    // First createClient() call: fetch this note's notebooks.
    const notebooksClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ notebook: "Ideas" }], error: null }),
    };
    // Second call: members of "Ideas" (notes joined via note_notebooks).
    const membersClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [noteN2, noteN3], error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(notebooksClient as never)
      .mockReturnValueOnce(membersClient as never);

    const groups = await noteService.getRelatedByNotebook(userId, "n1");

    expect(groups).toHaveLength(1);
    expect(groups[0].notebook).toBe("Ideas");
    expect(groups[0].notes.map((n) => n.id).sort()).toEqual(["n2", "n3"]);
  });

  it("addNotesToNotebook inserts one row per note", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      upsert,
    } as never);

    await noteService.addNotesToNotebook(userId, "Ideas", ["n2", "n3"]);

    expect(upsert).toHaveBeenCalledWith(
      [
        { note_id: "n2", notebook: "Ideas" },
        { note_id: "n3", notebook: "Ideas" },
      ],
      { onConflict: "note_id,notebook" },
    );
  });

  it("removeNoteFromNotebook deletes the single membership row", async () => {
    const eqNotebook = vi.fn().mockResolvedValue({ error: null });
    const eqNote = vi.fn().mockReturnValue({ eq: eqNotebook });
    const del = vi.fn().mockReturnValue({ eq: eqNote });
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      delete: del,
    } as never);

    await noteService.removeNoteFromNotebook(userId, "n3", "Ideas");

    expect(del).toHaveBeenCalled();
    expect(eqNote).toHaveBeenCalledWith("note_id", "n3");
    expect(eqNotebook).toHaveBeenCalledWith("notebook", "Ideas");
  });
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/unit/note.service.test.ts`
Expected: FAIL — `getRelatedByNotebook`/`addNotesToNotebook`/`removeNoteFromNotebook` are not functions.

- [ ] **Step 3: Add the notebook hydration helper**

In `src/lib/services/note.service.ts`, alongside `hydrateNoteAreaLinks`, add:

```ts
async function hydrateNoteNotebookLinks(notes: Note[]): Promise<Note[]> {
  if (notes.length === 0) return notes;
  const noteIds = notes.map((n) => n.id);
  const { data, error } = await createClient()
    .from("note_notebooks")
    .select("note_id, notebook")
    .in("note_id", noteIds);
  if (error) {
    throw new DatabaseError(error.message);
  }
  const byNote = new Map<string, string[]>();
  for (const row of data ?? []) {
    byNote.set(row.note_id, [...(byNote.get(row.note_id) ?? []), row.notebook]);
  }
  return notes.map((note) => ({ ...note, notebooks: (byNote.get(note.id) ?? []).sort() }));
}
```

Then add it to the `hydrateNoteRelations` chain:

```ts
async function hydrateNoteRelations(notes: Note[]): Promise<Note[]> {
  const withAreas = await hydrateNoteAreaLinks(notes);
  const withGoals = await hydrateNoteGoalLinks(withAreas);
  const withProjects = await hydrateNoteProjectLinks(withGoals);
  const withTasks = await hydrateNoteTaskLinks(withProjects);
  return await hydrateNoteNotebookLinks(withTasks);
}
```

- [ ] **Step 4: Add write helpers + membership methods**

Add these methods to the `noteService` object (place near `getByNotebook`):

```ts
  async replaceNotebooks(noteId: string, notebooks: string[]): Promise<void> {
    const client = createClient();
    const { error: delError } = await client.from("note_notebooks").delete().eq("note_id", noteId);
    if (delError) throw new DatabaseError(delError.message);
    if (notebooks.length === 0) return;
    const rows = notebooks.map((notebook) => ({ note_id: noteId, notebook }));
    const { error } = await client.from("note_notebooks").insert(rows);
    if (error) throw new DatabaseError(error.message);
  },

  async addNotesToNotebook(_userId: string, notebook: string, noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return;
    const rows = noteIds.map((note_id) => ({ note_id, notebook }));
    const { error } = await createClient()
      .from("note_notebooks")
      .upsert(rows, { onConflict: "note_id,notebook" });
    if (error) throw new DatabaseError(error.message);
  },

  async removeNoteFromNotebook(_userId: string, noteId: string, notebook: string): Promise<void> {
    const { error } = await createClient()
      .from("note_notebooks")
      .delete()
      .eq("note_id", noteId)
      .eq("notebook", notebook);
    if (error) throw new DatabaseError(error.message);
  },
```

- [ ] **Step 5: Replace `getRelated` with `getRelatedByNotebook`**

Replace the `getRelated` stub from Task 1 with:

```ts
  async getRelatedByNotebook(userId: string, noteId: string): Promise<RelatedNotebookGroup[]> {
    const { data: nbRows, error: nbError } = await createClient()
      .from("note_notebooks")
      .select("notebook")
      .eq("note_id", noteId);
    if (nbError) throw new DatabaseError(nbError.message);

    const notebooks = Array.from(new Set((nbRows ?? []).map((r) => r.notebook))).sort();
    if (notebooks.length === 0) return [];

    const groups: RelatedNotebookGroup[] = [];
    for (const notebook of notebooks) {
      const members = await this.getByNotebook(userId, notebook);
      const others = members.filter((n) => n.id !== noteId);
      if (others.length > 0) groups.push({ notebook, notes: others });
    }
    return groups;
  },
```

Add `RelatedNotebookGroup` to the domain-types import at the top of the file.

- [ ] **Step 6: Rework `getByNotebook` to use the junction**

Replace the existing `getByNotebook` (currently `return this.list(userId, { notebook })`) with a junction join:

```ts
  async getByNotebook(userId: string, notebook: string): Promise<Note[]> {
    const { data, error } = await createClient()
      .from("notes")
      .select(`${NOTE_SELECT}, note_notebooks!inner(notebook)`)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .eq("note_notebooks.notebook", notebook)
      .order("updated_at", { ascending: false });
    if (error) throw new DatabaseError(error.message);
    // Strip the embedded join object before hydration.
    const rows = (data ?? []).map(({ note_notebooks: _omit, ...note }) => note) as Note[];
    return hydrateNoteRelations(rows);
  },
```

- [ ] **Step 7: Run tests to verify pass**

Run: `npx vitest run tests/unit/note.service.test.ts`
Expected: PASS (existing 8 + 3 new = 11).

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/note.service.ts tests/unit/note.service.test.ts
git commit -m "feat: notebook membership read/write + related-by-notebook in note service"
```

### Task 7: Rework `listNotebooks`, `getNoteRelatedCounts`, `create`, `update`, and `list` filter

**Files:**
- Modify: `src/lib/services/note.service.ts`
- Test: `tests/unit/note.service.test.ts`

- [ ] **Step 1: Write failing test for `getNoteRelatedCounts` (notebook-based)**

```ts
  it("getNoteRelatedCounts counts distinct co-notebook notes", async () => {
    // note_notebooks rows: n1,n2,n3 in "Ideas"; n4,n5 in "Projects".
    const rows = [
      { note_id: "n1", notebook: "Ideas" },
      { note_id: "n2", notebook: "Ideas" },
      { note_id: "n3", notebook: "Ideas" },
      { note_id: "n4", notebook: "Projects" },
      { note_id: "n5", notebook: "Projects" },
    ];
    // 1) fetch notebooks for requested notes; 2) fetch all members of those notebooks
    vi.mocked(createClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: rows, error: null }),
      } as never)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: rows, error: null }),
      } as never);

    const counts = await noteService.getNoteRelatedCounts(userId, ["n1", "n4"]);

    expect(counts.get("n1")).toBe(2); // n2, n3
    expect(counts.get("n4")).toBe(1); // n5
  });
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run tests/unit/note.service.test.ts -t "co-notebook"`
Expected: FAIL (current `getNoteRelatedCounts` still references `note_related_notes`).

- [ ] **Step 3: Replace `getNoteRelatedCounts`**

```ts
  async getNoteRelatedCounts(_userId: string, noteIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    for (const id of noteIds) result.set(id, 0);
    if (noteIds.length === 0) return result;

    // Which notebooks do the requested notes belong to?
    const { data: own, error: ownErr } = await createClient()
      .from("note_notebooks")
      .select("note_id, notebook")
      .in("note_id", noteIds);
    if (ownErr) throw new DatabaseError(ownErr.message);

    const notebooksByNote = new Map<string, string[]>();
    const allNotebooks = new Set<string>();
    for (const row of own ?? []) {
      notebooksByNote.set(row.note_id, [...(notebooksByNote.get(row.note_id) ?? []), row.notebook]);
      allNotebooks.add(row.notebook);
    }
    if (allNotebooks.size === 0) return result;

    // All members of those notebooks.
    const { data: members, error: memErr } = await createClient()
      .from("note_notebooks")
      .select("note_id, notebook")
      .in("notebook", Array.from(allNotebooks));
    if (memErr) throw new DatabaseError(memErr.message);

    const membersByNotebook = new Map<string, Set<string>>();
    for (const row of members ?? []) {
      const set = membersByNotebook.get(row.notebook) ?? new Set<string>();
      set.add(row.note_id);
      membersByNotebook.set(row.notebook, set);
    }

    for (const id of noteIds) {
      const related = new Set<string>();
      for (const nb of notebooksByNote.get(id) ?? []) {
        for (const member of membersByNotebook.get(nb) ?? []) {
          if (member !== id) related.add(member);
        }
      }
      result.set(id, related.size);
    }
    return result;
  },
```

- [ ] **Step 4: Rework `listNotebooks` to read the junction**

```ts
  async listNotebooks(userId: string): Promise<string[]> {
    const { data, error } = await createClient()
      .from("note_notebooks")
      .select("notebook, notes!inner(user_id)")
      .eq("notes.user_id", userId);
    if (error) throw new DatabaseError(error.message);
    const set = new Set<string>();
    for (const row of data ?? []) set.add(row.notebook);
    return Array.from(set).sort();
  },
```

- [ ] **Step 5: Remove the `notebook` filter from `list` and wire `notebooks` through `create`/`update`**

In `list()` remove the `if (filters?.notebook) { query = query.eq("notebook", filters.notebook); }` block and remove `notebook?: string` from the filter type (notebook filtering now goes through `getByNotebook`).

In `create()`: after the `extractTaskIds` line add `const { notebooks, noteInput: nbCleaned } = extractNotebooks(noteInput);` (rename the final `noteInput` destructure to feed this), use `nbCleaned` for the insert, and after the other `replaceXLinks` calls add:

```ts
      if (notebooks.length) {
        await this.replaceNotebooks(data.id, notebooks);
      }
```

In `update()`: pull `notebooks` out of input before validation (mirror `goal_ids` handling), and after the other `replaceXLinks` calls add:

```ts
      if (notebooks !== undefined) {
        await this.replaceNotebooks(id, notebooks);
      }
```

- [ ] **Step 6: Delete the obsolete `linkRelated`, `unlinkRelated`, `bulkUpdateNotebook` methods**

Remove `linkRelated`, `unlinkRelated`, and `bulkUpdateNotebook` from `noteService` (replaced by `addNotesToNotebook`/`removeNoteFromNotebook`/`replaceNotebooks`).

- [ ] **Step 7: Run full service tests + typecheck**

Run: `npx vitest run tests/unit/note.service.test.ts`
Expected: PASS (12).
Run: `npx tsc --noEmit`
Expected: errors only in hooks/UI (fixed next).

- [ ] **Step 8: Commit**

```bash
git add src/lib/services/note.service.ts tests/unit/note.service.test.ts
git commit -m "feat: notebook-based related counts, listing, and create/update wiring"
```

---

## Phase 5 — Hooks

### Task 8: Rework note hooks for the notebook model

**Files:**
- Modify: `src/lib/hooks/use-notes.ts`

- [ ] **Step 1: Replace the related-notes hooks**

Replace `useRelatedNotes` (line ~357) with:

```ts
export function useRelatedNotesByNotebook(noteId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [NOTES_QUERY_KEY, "relatedByNotebook", user?.id ?? null, noteId],
    queryFn: () => noteService.getRelatedByNotebook(user!.id, noteId),
    enabled: !!user && !!noteId,
  });
}
```

Replace `useLinkRelatedNote` and `useUnlinkRelatedNote` with:

```ts
export function useAddNotesToNotebook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ notebook, noteIds }: { notebook: string; noteIds: string[] }) =>
      noteService.addNotesToNotebook(user!.id, notebook, noteIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.success("Added to notebook");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to add to notebook"),
  });
}

export function useRemoveNoteFromNotebook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ noteId, notebook }: { noteId: string; notebook: string }) =>
      noteService.removeNoteFromNotebook(user!.id, noteId, notebook),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      toast.success("Removed from notebook");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove from notebook"),
  });
}
```

- [ ] **Step 2: Repoint the bulk `updateNotebook` mutation**

Replace the `updateNotebook` mutation (line ~429) body with `addNotesToNotebook`:

```ts
    updateNotebook: useMutation({
      mutationFn: ({ noteIds, notebook }: { noteIds: string[]; notebook: string }) =>
        noteService.addNotesToNotebook(user!.id, notebook, noteIds),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
        toast.success("Added to notebook");
      },
    }),
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors now only in UI files (note-detail-content, note-metadata-panel, notes-content, knowledge page, queries).

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/use-notes.ts
git commit -m "feat: notebook membership hooks replace related-note link hooks"
```

---

## Phase 6 — UI: notebook tag input

### Task 9: Notebook tag combobox in the metadata panel

**Files:**
- Modify: `src/components/entities/note-metadata-panel.tsx`

- [ ] **Step 1: Change the prop contract**

Replace `notebook: string | null;` (line 67) with `notebooks: string[];`, and replace the `onNotebookChange`/`onNotebookBlur` props (lines 77-78) with:

```ts
  notebooks: string[];
  notebookOptions: string[];
  onNotebooksChange: (notebooks: string[]) => void;
```

Update the destructure in the component signature accordingly (remove `notebook`, `onNotebookChange`, `onNotebookBlur`; add `notebooks`, `notebookOptions`, `onNotebooksChange`).

- [ ] **Step 2: Replace the notebook `<Input>` block with a `NotebookSelector`**

Replace the notebook field block (lines 321-334) with:

```tsx
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          <BookOpen className="mr-1 inline size-3" />
          Notebooks
        </Label>
        <NotebookSelector
          options={notebookOptions}
          selected={notebooks}
          onChange={onNotebooksChange}
          disabled={disabled}
        />
        {notebooks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {notebooks.map((nb) => (
              <Badge key={nb} variant="secondary" className="flex items-center gap-1">
                <BookOpen className="size-3" />
                <span className="max-w-[120px] truncate">{nb}</span>
                <button
                  type="button"
                  onClick={() => onNotebooksChange(notebooks.filter((n) => n !== nb))}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
```

- [ ] **Step 3: Add the `NotebookSelector` component (free-create combobox)**

Add at the bottom of the file, modeled on `AreaSelector` but operating on strings with a create-on-enter affordance:

```tsx
function NotebookSelector({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: string[];
  selected: string[];
  onChange: (notebooks: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (notebook: string) => {
    onChange(
      selectedSet.has(notebook)
        ? selected.filter((n) => n !== notebook)
        : [...selected, notebook],
    );
  };

  const trimmed = query.trim();
  const canCreate =
    trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        <span className="truncate">
          {selected.length === 0 ? "Select or create notebook..." : `${selected.length} selected`}
        </span>
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or create..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={() => {
                    toggle(trimmed);
                    setQuery("");
                  }}
                >
                  <BookOpen className="mr-2 size-3.5" />
                  Create &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>No notebooks found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((nb) => (
                <CommandItem key={nb} value={nb} onSelect={() => toggle(nb)} className="flex items-center gap-2">
                  <Checkbox checked={selectedSet.has(nb)} />
                  <span className="flex-1 truncate text-sm">{nb}</span>
                  {selectedSet.has(nb) && <Check className="ml-auto size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Typecheck the file**

Run: `npx tsc --noEmit`
Expected: the panel's own errors gone; remaining errors are in callers passing the old `notebook` prop (fixed in Task 10 & sweep).

- [ ] **Step 5: Commit**

```bash
git add src/components/entities/note-metadata-panel.tsx
git commit -m "feat: notebook tag combobox in note metadata panel"
```

---

## Phase 7 — UI: detail page sections + link dialog

### Task 10: Per-notebook related sections and the link-to-notebook dialog

**Files:**
- Modify: `src/app/(dashboard)/notes/[id]/note-detail-content.tsx`

- [ ] **Step 1: Swap the hooks/imports**

Update the imports (lines ~50-53) from `useRelatedNotes, useLinkRelatedNote, useUnlinkRelatedNote` to `useRelatedNotesByNotebook, useAddNotesToNotebook, useRemoveNoteFromNotebook`, and add `useNotebooks`. Add a `Dialog` import set from `@/components/ui/dialog` if not present.

Replace the hook instances (lines ~106-108):

```ts
  const { data: relatedGroups = [] } = useRelatedNotesByNotebook(note?.id ?? "");
  const { data: notebookOptions = [] } = useNotebooks();
  const addToNotebook = useAddNotesToNotebook();
  const removeFromNotebook = useRemoveNoteFromNotebook();
```

- [ ] **Step 2: Replace the Related Notes section markup**

Replace the whole `Related Notes` block (lines ~318-385) with a per-notebook grouped layout plus a "Link to Notebook" trigger. The note's own notebooks are read from `note.notebooks ?? []`.

```tsx
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Related Notes</h3>
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
                <Link2 className="mr-1.5 size-3.5" />Link to Notebook
              </Button>
            </div>
            {relatedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related notes yet.</p>
            ) : (
              relatedGroups.map((group) => (
                <div key={group.notebook} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <BookOpen className="size-3.5" />
                    {group.notebook}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.notes.map((rn) => (
                      <div
                        key={rn.id}
                        className="group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => router.push(`/notes/${rn.slug ?? rn.id}`)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <NotebookPen className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{rn.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">{rn.type}</Badge>
                        </div>
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromNotebook.mutate({ noteId: rn.id, notebook: group.notebook });
                          }}
                          title={`Remove from ${group.notebook}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
```

- [ ] **Step 3: Add the link-to-notebook dialog state + component**

Near the other `useState` calls in `NoteDetailContent`, add:

```ts
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
```

Add the dialog before the component's closing tag. Field 1 = notebook dropdown (any existing option), Field 2 = multi-select notes. On submit, add the chosen notebook to the selected notes AND to the current note (so they're genuinely related):

```tsx
      <LinkToNotebookDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        notebookOptions={notebookOptions}
        currentNotebooks={note.notebooks ?? []}
        candidateNotes={allNotes.filter((n) => n.id !== note.id)}
        onSubmit={(notebook, noteIds) => {
          addToNotebook.mutate({ notebook, noteIds: [note.id, ...noteIds] });
          setLinkDialogOpen(false);
        }}
      />
```

- [ ] **Step 4: Implement `LinkToNotebookDialog`**

Add at the bottom of `note-detail-content.tsx` (uses `Dialog`, `Select`, `Command`, `Checkbox` — all already used in the codebase):

```tsx
function LinkToNotebookDialog({
  open,
  onOpenChange,
  notebookOptions,
  currentNotebooks,
  candidateNotes,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookOptions: string[];
  currentNotebooks: string[];
  candidateNotes: Note[];
  onSubmit: (notebook: string, noteIds: string[]) => void;
}) {
  const [notebook, setNotebook] = useState<string>("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setNotebook(currentNotebooks[0] ?? notebookOptions[0] ?? "");
      setPicked(new Set());
      setQuery("");
    }
  }, [open, currentNotebooks, notebookOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidateNotes.filter((n) => !q || n.name.toLowerCase().includes(q)).slice(0, 50);
  }, [candidateNotes, query]);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link notes to a notebook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notebook</Label>
            <Select value={notebook} onValueChange={setNotebook}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a notebook" />
              </SelectTrigger>
              <SelectContent>
                {notebookOptions.map((nb) => (
                  <SelectItem key={nb} value={nb}>{nb}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes to add</Label>
            <Command shouldFilter={false} className="rounded-md border">
              <CommandInput placeholder="Search notes…" value={query} onValueChange={setQuery} />
              <CommandList className="max-h-56">
                <CommandEmpty>No notes found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((n) => (
                    <CommandItem key={n.id} value={n.id} onSelect={() => togglePick(n.id)} className="flex items-center gap-2">
                      <Checkbox checked={picked.has(n.id)} />
                      <span className="truncate text-sm">{n.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!notebook || picked.size === 0}
            onClick={() => onSubmit(notebook, Array.from(picked))}
          >
            Add {picked.size > 0 ? `(${picked.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Pass `notebooks` into the metadata panel within this file**

Find the `<NoteMetadataPanel … />` usage and replace the old `notebook`/`onNotebookChange`/`onNotebookBlur` props with `notebooks={note.notebooks ?? []}`, `notebookOptions={notebookOptions}`, and an `onNotebooksChange` that calls the existing note update mutation with `{ notebooks }`.

- [ ] **Step 6: Typecheck + manual browser check**

Run: `npx tsc --noEmit`
Expected: this file clean; remaining errors only in notes-content / knowledge / queries.

Manual (after the sweep task compiles the app): open a note in notebook "Ideas", click **Link to Notebook**, pick "Ideas" + two notes, submit. Open one of those notes → it shows an "Ideas" section listing the others. Click the X on a card → it leaves that notebook everywhere.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/notes/[id]/note-detail-content.tsx"
git commit -m "feat: per-notebook related sections and link-to-notebook dialog"
```

---

## Phase 8 — UI sweep + SSR hydration

### Task 11: Notes list — filter, group-by-notebook, badges, create form

**Files:**
- Modify: `src/app/(dashboard)/notes/notes-content.tsx`
- Modify: `src/components/entities/note-row.tsx`
- Modify: `src/app/(dashboard)/notes/new/page.tsx`

- [ ] **Step 1: Notebook list + filter (multi-value aware)**

In `notes-content.tsx`, change the derived `notebooks` (line ~151) to flatten arrays:

```ts
  const notebooks = useMemo(
    () => Array.from(new Set(allNotes.flatMap((n) => n.notebooks ?? []))).sort(),
    [allNotes],
  );
```

Change the notebook filter predicate (line ~196):

```ts
    if (filterNotebook !== ALL_NOTEBOOK_VALUE) {
      result = result.filter((n) => (n.notebooks ?? []).includes(filterNotebook));
    }
```

- [ ] **Step 2: Group-by-notebook (a note appears under each of its notebooks)**

Replace the `noteGroupsByNotebook` memo (lines ~283-295):

```ts
  const noteGroupsByNotebook = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const note of allNotes.filter((n) => !n.is_archived)) {
      const keys = (note.notebooks ?? []).length > 0 ? note.notebooks! : ["unassigned"];
      for (const key of keys) {
        grouped.set(key, [...(grouped.get(key) ?? []), note]);
      }
    }
    return Array.from(grouped.entries()).map(([notebook, notes]) => ({
      groupId: notebook,
      groupName: notebook === "unassigned" ? "No Notebook" : notebook,
      notes,
    }));
  }, [allNotes]);
```

- [ ] **Step 3: Row badges (render all notebooks)**

Replace the single-notebook badge block (lines ~476-481) with a map:

```tsx
          {(note.notebooks ?? []).map((nb) => (
            <Badge key={nb} variant="outline" className="gap-1 text-xs font-normal">
              <BookOpen className="size-3" />
              {nb}
            </Badge>
          ))}
```

Apply the same change in `src/components/entities/note-row.tsx` (its `note.notebook` badge → map over `note.notebooks`).

- [ ] **Step 4: Create form — tag input instead of single field**

In the create dialog (lines ~1141-1152), replace `noteForm.notebook` (a string) with `noteForm.notebooks` (a `string[]`) and render the same `NotebookSelector` pattern (or a comma-friendly multi-input). Update `noteForm` initial state (`notebook: ""` → `notebooks: []` at lines ~288 and ~384) and the create payload (`notebook: noteForm.notebook || null` → `notebooks: noteForm.notebooks` at line ~393).

- [ ] **Step 5: `new` note page — seed from `?notebook=`**

In `src/app/(dashboard)/notes/new/page.tsx`, change the `?notebook=` handling so the seed becomes `notebooks: [param]` instead of `notebook: param`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: notes-content/note-row/new-page clean.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(dashboard)/notes/notes-content.tsx" src/components/entities/note-row.tsx "src/app/(dashboard)/notes/new/page.tsx"
git commit -m "feat: multi-notebook filter, grouping, badges, and create form"
```

### Task 12: Knowledge page + SSR query hydration

**Files:**
- Modify: `src/app/(dashboard)/knowledge/page.tsx`
- Modify: `src/lib/queries/note-detail.queries.ts`, `notes.queries.ts`, `topic-detail.queries.ts`, `area-detail.queries.ts`
- Test: `src/lib/__tests__/server-query-hydration.test.ts`

- [ ] **Step 1: Knowledge page badges + create form**

In `knowledge/page.tsx`, replace `note.notebook` badge rendering (lines ~462-464) with a map over `note.notebooks`, and change the create form's single `notebook` field to push into a `notebooks` array (lines ~288, ~393, ~1143-1151).

- [ ] **Step 2: SSR hydration of `notebooks`**

In each query file that selects notes for the cache, after fetching the note rows, attach `notebooks` by querying `note_notebooks` for those note ids (mirror the `hydrateResourceLinks` pattern already in `project-detail.queries.ts`). Add a shared helper in `notes.queries.ts`:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hydrateNotebooks(supabase: SupabaseClient, notes: any[]) {
  if (notes.length === 0) return notes
  const ids = notes.map((n) => n.id)
  const { data } = await supabase.from("note_notebooks").select("note_id, notebook").in("note_id", ids)
  const byNote = new Map<string, string[]>()
  for (const row of (data ?? []) as Array<{ note_id: string; notebook: string }>) {
    byNote.set(row.note_id, [...(byNote.get(row.note_id) ?? []), row.notebook])
  }
  return notes.map((n) => ({ ...n, notebooks: (byNote.get(n.id) ?? []).sort() }))
}
```

Call `hydrateNotebooks(supabase, rows)` in the note-fetching server functions in all four query files, dropping any `notebook` column reference from their `SELECT` strings.

- [ ] **Step 3: Update hydration test**

In `src/lib/__tests__/server-query-hydration.test.ts`, update any assertion that expects a `notebook` string on hydrated notes to expect a `notebooks` array.

- [ ] **Step 4: Typecheck + run hydration test**

Run: `npx tsc --noEmit`
Expected: clean across the repo.
Run: `npx vitest run src/lib/__tests__/server-query-hydration.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/knowledge/page.tsx" src/lib/queries/note-detail.queries.ts src/lib/queries/notes.queries.ts src/lib/queries/topic-detail.queries.ts src/lib/queries/area-detail.queries.ts src/lib/__tests__/server-query-hydration.test.ts
git commit -m "feat: hydrate note notebooks across knowledge page and SSR queries"
```

---

## Phase 9 — Drop the legacy column + final verification

### Task 13: Drop `notes.notebook` and finish

**Files:**
- Create: `supabase/migrations/20260525000003_drop_notes_notebook_column.sql`
- Modify: `src/lib/types/database.types.ts`
- Modify: `src/lib/services/note.service.ts` (`NOTE_SELECT`)

- [ ] **Step 1: Confirm no remaining readers of the column**

Run a search for `\.notebook\b` (singular property access) and `"notebook"` inside `NOTE_SELECT`. Confirm the only references left are the multi-value `notebooks` array and notebook-name strings — not the old column.

- [ ] **Step 2: Remove `notebook` from `NOTE_SELECT`**

In `src/lib/services/note.service.ts` line ~22, delete `notebook, ` from the `NOTE_SELECT` string.

- [ ] **Step 3: Write the drop migration**

```sql
-- notes.notebook is fully replaced by the note_notebooks junction table.
ALTER TABLE notes DROP COLUMN IF EXISTS notebook;
```

- [ ] **Step 4: Remove `notebook` from `notes` in database.types.ts**

Delete the three `notebook: string | null;` / `notebook?: string | null;` lines (194, 213, 232) from the `notes` table Row/Insert/Update.

- [ ] **Step 5: Apply migration + full verification**

Run: `npx supabase migration up`
Run: `npx tsc --noEmit` → Expected: clean.
Run: `npx vitest run` → Expected: all suites pass.
Run: `npm run lint` → Expected: clean.

- [ ] **Step 6: Manual end-to-end browser check (port 3030)**

Verify the full N1–N5 scenario from the spec:
1. Give N1 the notebook "Ideas" via the tag combobox.
2. On N1, **Link to Notebook** → "Ideas" → pick N2, N3 → Add.
3. Open N2 → "Ideas" section shows N1 and N3; N2's metadata shows the "Ideas" tag.
4. Open N3 → "Ideas" section shows N1 and N2.
5. Give N4 the notebook "Projects"; link N5; open N5 → "Projects" section shows N4.
6. On N2, X the N3 card → N3 leaves "Ideas" (gone from N1's section too). On N2, remove the "Ideas" chip → N2's section disappears, N1/N3 unaffected.
7. Add a second notebook ("Health") to N2 → N2's detail page shows two sections.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260525000003_drop_notes_notebook_column.sql src/lib/types/database.types.ts src/lib/services/note.service.ts
git commit -m "feat: drop legacy notes.notebook column"
```

---

## Self-review notes

- **Spec coverage:** multi-value notebook field (Tasks 5, 9, 11, 12) ✓; dropdown of existing + create (Task 9 `NotebookSelector`) ✓; link dialog = notebook dropdown + multi-select notes (Task 10) ✓; picking a notebook the current note lacks also tags the current note (Task 10 Step 3, `[note.id, ...noteIds]`) ✓; related shown as one section per notebook (Task 10 Step 2) ✓; unlink = remove membership row, works from any page (Task 10 Step 2 X button → `removeFromNotebook`) ✓.
- **Type consistency:** `Note.notebooks: string[]`, `RelatedNotebookGroup { notebook; notes }`, service methods `getRelatedByNotebook`/`addNotesToNotebook`/`removeNoteFromNotebook`/`replaceNotebooks`, hooks `useRelatedNotesByNotebook`/`useAddNotesToNotebook`/`useRemoveNoteFromNotebook` — names used consistently across Tasks 5–12.
- **Sequencing:** column dropped only in Task 13 after all readers move to the junction, so the app compiles at each phase boundary.
