/**
 * API-key differential permission harness (plan Task 4, report recommendation 3).
 *
 * Drives the REAL route handlers for every entity `/:id` route through the
 * REAL authorization stack — authenticateRequest → requirePaidTier →
 * evaluateApiKeyRequestPolicy → enforceApiKeyRoutePermission — with only the
 * infrastructure boundaries (Supabase clients, services, rate limiter,
 * audit) module-mocked. The matrix asserts, permanently in CI:
 *
 *   1. Encoded invariant: a %2D-encoded entity id behaves EXACTLY like its
 *      plain-UUID form in every cell (the vuln-0002 bypass class).
 *   2. Fail-closed invariant: a slug-shaped id on an unmapped path is
 *      denied 403 for every key mode (recommendation 3).
 *   3. Permanent delete stays dashboard-only: DELETE /<entity>/<id> is 403
 *      for every key mode, plain or encoded or slug.
 *   4. Scope model: read_only keys cannot write; write_limited keys cannot
 *      PATCH an entity id; write_enabled keys pass the permission layer.
 *   5. No denied cell ever returns 2xx.
 *
 * Runs in-process (no dev server, no database) so CI needs no credentials:
 * every bypass denial happens in the authorization stack before any data
 * access, which is exactly the layer under test. The 90-route filesystem is
 * additionally swept by scripts/check-route-permissions.mjs (map coverage).
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

delete process.env.SOPHION_DISABLE_API_KEY_WRITES;
delete process.env.DISABLE_API_KEY_WRITES;

/** The bearer token carries the mode under test: `mode:<access_mode>`. */
vi.mock("@/lib/api/api-key-service", () => ({
  validateApiKey: vi.fn(async (token: string) => {
    const mode = /^mode:([a-z_]+)$/.exec(token)?.[1] ?? "read_only";
    return {
      userId: "user-key",
      keyId: "key-harness",
      accessMode: mode,
      clientType: "mcp",
      clientName: "Differential harness",
    };
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: null })),
}));

vi.mock("@/lib/api/subscription", () => ({
  requirePaidTier: vi.fn(async () => undefined),
}));

vi.mock("@/lib/api/ai-access-service", () => ({
  getAiAccessSettings: vi.fn(async () => ({
    ai_access_enabled: true,
    ai_write_access_enabled: true,
    privacy_notice_version: "v1",
    privacy_notice_accepted_at: "2026-01-01T00:00:00.000Z",
  })),
  setAiAccessSettings: vi.fn(async () => ({})),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  recordApiMutationAudit: vi.fn(async () => {}),
  createRequestId: vi.fn(() => "req-harness"),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, remaining: 99, limit: 100 })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createDataClient: vi.fn(async () => ({})),
}));

/** Any method on any mocked service resolves to an owned-looking row. */
function universalService(): Record<string, unknown> {
  const cache = new Map<string, unknown>();
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop !== "string" || ["then", "catch", "finally"].includes(prop)) {
          return undefined;
        }
        if (!cache.has(prop)) {
          cache.set(
            prop,
            vi.fn(async () => ({ id: "id-1", user_id: "user-key" })),
          );
        }
        return cache.get(prop);
      },
    },
  );
}

vi.mock("@/lib/services/area.service", () => ({ areaService: universalService() }));
vi.mock("@/lib/services/goal.service", () => ({ goalService: universalService() }));
vi.mock("@/lib/services/project.service", () => ({ projectService: universalService() }));
vi.mock("@/lib/services/task.service", () => ({ taskService: universalService() }));
vi.mock("@/lib/services/note.service", () => ({ noteService: universalService() }));
vi.mock("@/lib/services/resource.service", () => ({ resourceService: universalService() }));
vi.mock("@/lib/services/topic.service", () => ({ topicService: universalService() }));
vi.mock("@/lib/services/contact.service", () => ({ contactService: universalService() }));

const ENTITIES = [
  "areas",
  "goals",
  "projects",
  "tasks",
  "notes",
  "resources",
  "topics",
  "contacts",
] as const;
const MODES = ["read_only", "write_limited", "write_enabled"] as const;

const UUID = "550e8400-e29b-41d4-a716-446655440000";
const ENCODED = UUID.replaceAll("-", "%2D");
const SLUG = "my-item-slug";

// From the scope model in api-scopes.ts: write_limited presets grant
// tasks/notes/resources writes only; the other entities need write_enabled.
const WRITE_LIMITED_ENTITIES = new Set(["tasks", "notes", "resources"]);
/** PATCH in this mode+entity is expected to pass the permission layer. */
function patchAllowed(mode: string, entity: string, variant: string): boolean {
  if (variant === SLUG) return false;
  if (mode === "write_enabled") return true;
  if (mode === "write_limited") return WRITE_LIMITED_ENTITIES.has(entity);
  return false;
}

type Handlers = Record<"GET" | "PATCH" | "DELETE", (req: NextRequest, ctx: unknown) => Promise<Response>>;
const routes = new Map<string, Handlers>();

beforeAll(async () => {
  for (const entity of ENTITIES) {
    routes.set(entity, (await import(`@/app/api/v1/${entity}/[id]/route`)) as Handlers);
  }
});

async function call(
  entity: string,
  method: "GET" | "PATCH" | "DELETE",
  id: string,
  mode: string,
): Promise<{ status: number; code?: string }> {
  const handler = routes.get(entity)![method];
  const req = new NextRequest(`http://localhost/api/v1/${entity}/${id}`, {
    method,
    headers: {
      authorization: `Bearer mode:${mode}`,
      ...(method === "PATCH" ? { "content-type": "application/json" } : {}),
    },
    ...(method === "PATCH" ? { body: JSON.stringify({}) } : {}),
  });
  const res = await handler(req, { params: Promise.resolve({ id }) });
  let code: string | undefined;
  try {
    const body = (await res.json()) as { error?: { code?: string } };
    code = body?.error?.code;
  } catch {
    // non-JSON body — status assertion still applies
  }
  return { status: res.status, code };
}

const isDenied = (status: number) => status === 403 || status === 404;
const is2xx = (status: number) => status >= 200 && status < 300;

describe("api-key differential permission harness", () => {
  it("GET plain UUID resolves for every entity × mode (control)", async () => {
    for (const entity of ENTITIES) {
      for (const mode of MODES) {
        const { status } = await call(entity, "GET", UUID, mode);
        expect([entity, mode, status]).toEqual([entity, mode, 200]);
      }
    }
  });

  it("GET %2D-encoded UUID behaves identically to plain (vuln-0002 invariant)", async () => {
    for (const entity of ENTITIES) {
      for (const mode of MODES) {
        const { status } = await call(entity, "GET", ENCODED, mode);
        expect([entity, mode, status]).toEqual([entity, mode, 200]);
      }
    }
  });

  it("GET slug form is denied 403 for every entity × mode (fail-closed)", async () => {
    for (const entity of ENTITIES) {
      for (const mode of MODES) {
        const { status } = await call(entity, "GET", SLUG, mode);
        expect([entity, mode, status]).toEqual([entity, mode, 403]);
      }
    }
  });

  it("PATCH per mode: encoded matches plain; denied cells never 2xx", async () => {
    for (const entity of ENTITIES) {
      // read_only: method gate denies plain and encoded alike
      const roPlain = await call(entity, "PATCH", UUID, "read_only");
      const roEncoded = await call(entity, "PATCH", ENCODED, "read_only");
      expect(roPlain.status).toBe(403);
      expect(roEncoded.status).toBe(403);
      // write_limited: denied by scope on entities outside its preset
      const wlPlain = await call(entity, "PATCH", UUID, "write_limited");
      const wlEncoded = await call(entity, "PATCH", ENCODED, "write_limited");
      if (WRITE_LIMITED_ENTITIES.has(entity)) {
        expect(wlPlain.status).toBe(200);
      } else {
        expect(wlPlain.status).toBe(403);
      }
      expect(wlEncoded.status).toBe(wlPlain.status);
      // write_enabled: permission layer passes — encoded must match plain
      const wePlain = await call(entity, "PATCH", UUID, "write_enabled");
      const weEncoded = await call(entity, "PATCH", ENCODED, "write_enabled");
      expect(is2xx(wePlain.status) || wePlain.status === 422).toBe(true);
      expect(weEncoded.status).toBe(wePlain.status);
      // slug: 403 for every mode
      for (const mode of MODES) {
        const { status } = await call(entity, "PATCH", SLUG, mode);
        expect([entity, mode, status]).toEqual([entity, mode, 403]);
      }
    }
  });

  it("DELETE is dashboard-only for every entity × mode × variant", async () => {
    for (const entity of ENTITIES) {
      for (const mode of MODES) {
        for (const variant of [UUID, ENCODED, SLUG]) {
          const { status, code } = await call(entity, "DELETE", variant, mode);
          expect([entity, mode, variant, status]).toEqual([entity, mode, variant, 403]);
          if (variant !== SLUG || mode !== "read_only") {
            // read_only+slug may be denied by the method gate before the
            // permanent-delete rule; everything else must carry the code.
            expect(code).toBeDefined();
          }
        }
      }
    }
  });

  it("no denied cell ever returns 2xx (whole-matrix sweep)", async () => {
    for (const entity of ENTITIES) {
      for (const mode of MODES) {
        for (const variant of [UUID, ENCODED, SLUG]) {
          for (const method of ["GET", "PATCH", "DELETE"] as const) {
            const { status } = await call(entity, method, variant, mode);
            const denied =
              variant === SLUG ||
              method === "DELETE" ||
              (method === "PATCH" && !patchAllowed(mode, entity, variant));
            if (denied) {
              expect([entity, mode, variant, method, is2xx(status)]).toEqual([
                entity,
                mode,
                variant,
                method,
                false,
              ]);
              expect(isDenied(status)).toBe(true);
            }
          }
        }
      }
    }
  });
});
