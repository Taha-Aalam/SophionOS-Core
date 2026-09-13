/**
 * Structural guard test (plan Task 5, report recommendation 4): every
 * junction-table writer in the service layer must call assertOwnedIds.
 *
 * The API-key path uses a service-role client (RLS bypassed by design), so
 * junction writes are the tenant-isolation boundary. This test derives the
 * junction-table inventory from supabase/migrations, finds every service
 * function that writes to one, and requires the guard in the same function
 * body. A new service writer without the guard fails here — and a new
 * junction migration with no guarded service writer fails the coverage
 * assertion at the bottom.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase/migrations");
const SERVICES_DIR = join(REPO_ROOT, "src/lib/services");
const SERVICE_FILES = [
  "contact.service.ts",
  "goal.service.ts",
  "note.service.ts",
  "project.service.ts",
  "resource.service.ts",
  "task.service.ts",
  "topic.service.ts",
];

const ENTITY_WORDS = [
  "area",
  "goal",
  "project",
  "task",
  "note",
  "resource",
  "topic",
  "contact",
  "notebook",
  // relation word used by note_related_notes (notes ↔ related notes)
  "related",
];

/** Junction tables straight from the migrations (the schema source of truth). */
function junctionTablesFromMigrations(): string[] {
  const tables = new Set<string>();
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    for (const m of sql.matchAll(/create table\s+(?:if not exists\s+)?["`]?([a-z_]+)["`]?/gi)) {
      const name = m[1];
      // Junction names pair two entity words: goal_notes, contact_areas,
      // note_related_notes, note_notebooks, task_projects, …
      const parts = name.split("_").filter(Boolean);
      if (
        parts.length >= 2 &&
        parts.every((p) => ENTITY_WORDS.includes(p) || ENTITY_WORDS.includes(p.replace(/s$/, "")))
      ) {
        tables.add(name);
      }
    }
  }
  return [...tables].sort();
}

type Segment = { name: string; body: string };

/**
 * Split a service file into function segments: module-level functions and
 * 2-space-indented object methods (the service-object style used here).
 */
function functionSegments(src: string): Segment[] {
  const lines = src.split("\n");
  const starts: Array<{ index: number; name: string }> = [];
  lines.forEach((line, index) => {
    const moduleFn = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/.exec(line);
    const methodFn = /^ {2}async\s+(\w+)\s*[(<]/.exec(line);
    if (moduleFn) starts.push({ index, name: moduleFn[1] });
    else if (methodFn) starts.push({ index, name: methodFn[1] });
  });
  const segments: Segment[] = [];
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : lines.length;
    segments.push({
      name: starts[i].name,
      body: lines.slice(starts[i].index, end).join("\n"),
    });
  }
  return segments;
}

const JUNCTIONS = junctionTablesFromMigrations();
const WRITE_OPS = /\.(insert|upsert|delete|update)\(/;

function writersFor(serviceFile: string, junction: string): Segment[] {
  const src = readFileSync(join(SERVICES_DIR, serviceFile), "utf8");
  return functionSegments(src).filter(
    (seg) =>
      seg.body.includes(`.from("${junction}")`) && WRITE_OPS.test(seg.body),
  );
}

describe("junction writers structurally require assertOwnedIds", () => {
  it("derives a non-empty junction inventory from the migrations", () => {
    // Sanity for the derivation itself: the known core junctions must appear.
    for (const expected of [
      "goal_notes",
      "note_areas",
      "task_projects",
      "contact_areas",
      "topic_areas",
      "note_related_notes",
      "note_notebooks",
    ]) {
      expect(JUNCTIONS).toContain(expected);
    }
    expect(JUNCTIONS.length).toBeGreaterThanOrEqual(15);
  });

  it("every junction write in the service layer is guarded by assertOwnedIds", () => {
    const unguarded: string[] = [];
    let writerCount = 0;
    for (const file of SERVICE_FILES) {
      for (const junction of JUNCTIONS) {
        for (const seg of writersFor(file, junction)) {
          writerCount++;
          if (!seg.body.includes("assertOwnedIds")) {
            unguarded.push(`${file}#${seg.name} -> ${junction}`);
          }
        }
      }
    }
    // The assessed regression: nine-plus unguarded writers existed pre-fix.
    expect(writerCount).toBeGreaterThan(9);
    expect(unguarded).toEqual([]);
  });

  it("every migration junction table has a guarded service writer or a recorded exception", () => {
    // Junction tables with NO application-layer writer at all: the API path
    // cannot reach them, so isolation rests on their RLS policies. Anything
    // added here must name the reason and be revisited when a writer appears.
    const NO_WRITER_EXCEPTIONS: Record<string, string> = {
      note_related_notes:
        "no service writes this table (RLS-only, dual-ownership policies); revisit if a writer is added",
    };
    const missing: string[] = [];
    for (const junction of JUNCTIONS) {
      const anyWriter = SERVICE_FILES.flatMap((f) => writersFor(f, junction));
      if (anyWriter.length === 0) {
        if (!NO_WRITER_EXCEPTIONS[junction]) missing.push(junction);
        continue;
      }
      const guarded = anyWriter.filter((seg) => seg.body.includes("assertOwnedIds"));
      if (guarded.length === 0) missing.push(junction);
    }
    expect(missing).toEqual([]);
  });
});
