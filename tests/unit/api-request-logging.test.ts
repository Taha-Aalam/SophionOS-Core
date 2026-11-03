import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Proof tests for the API observability layer (docs/prompts/fix-api-requests):
 *
 *  - every API request emits exactly one structured `api_request` line,
 *  - a handled 5xx emits exactly one `api_error` line carrying the wrapped
 *    cause, while the client response stays byte-identical,
 *  - `x-request-id` flows in/out of both the log lines and the response,
 *  - request bodies, query strings and auth material never reach a log line,
 *  - LOG_LEVEL=warn silences request lines but never 5xx error lines.
 */

const mockAuth = vi.fn(async () => ({ userId: "user_123" }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/api/subscription", () => ({
  requirePaidTier: vi.fn(async () => {}),
  clearTierCache: vi.fn(),
  invalidateEntitlementCaches: vi.fn(),
  getSubscription: vi.fn(),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createDataClient: vi.fn(async () => ({ from: vi.fn() })),
  createClient: vi.fn(async () => ({ from: vi.fn() })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("admin client not available in unit tests");
  }),
}));

vi.mock("@/lib/services/project.service", () => ({
  projectService: {
    getById: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
  },
}));

import { projectService } from "@/lib/services/project.service";
import { DatabaseError } from "@/lib/api/error-handler";
import { GET as getProject } from "@/app/api/v1/projects/[id]/route";
import { POST as createProject } from "@/app/api/v1/projects/route";
import { RELEASE_TAG } from "@/lib/watermark/release";

type LogLine = Record<string, unknown> & { level?: string; event?: string };

let captured: LogLine[] = [];
let consoleSpies: Array<{ mockRestore: () => void }> = [];

/** Capture only structured single-line JSON logs; anything else is dropped. */
function captureConsole(): void {
  captured = [];
  consoleSpies = [];
  for (const level of ["log", "info", "warn", "error"] as const) {
    consoleSpies.push(
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        const [first] = args;
        if (typeof first !== "string" || !first.startsWith("{")) return;
        try {
          captured.push(JSON.parse(first) as LogLine);
        } catch {
          // Not a structured log line (e.g. a stray JSON-ish string).
        }
      }),
    );
  }
}

function requestLines(): LogLine[] {
  return captured.filter((line) => line.event === "api_request");
}

function errorLines(): LogLine[] {
  return captured.filter((line) => line.event === "api_error");
}

const PROJECT = { id: "11111111-1111-4111-8111-111111111111", name: "Alpha" };

function getRequest(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(url, { method: "GET", headers });
}

beforeEach(() => {
  process.env.LOG_LEVEL = "info";
  captureConsole();
  mockAuth.mockResolvedValue({ userId: "user_123" });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_LEVEL;
});

describe("handled DatabaseError (5xx)", () => {
  it("emits one error line with the real cause and keeps the client response byte-identical", async () => {
    vi.mocked(projectService.getById).mockRejectedValueOnce(
      new DatabaseError('invalid input syntax for type uuid: "not-a-uuid"', {
        code: "22P02",
        message: 'invalid input syntax for type uuid: "not-a-uuid"',
      }),
    );

    const res = await getProject(
      getRequest("http://localhost/api/v1/projects/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) },
    );

    // Client contract unchanged: status, body and release header.
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      JSON.stringify({
        error: { code: "DATABASE_ERROR", message: "An unexpected error occurred" },
      }),
    );
    expect(res.headers.get("X-Sophonios-Release")).toBe(RELEASE_TAG);

    const errors = errorLines();
    expect(errors).toHaveLength(1);
    const line = errors[0];
    expect(line.level).toBe("error");
    expect(line.request_id).toBe(res.headers.get("x-request-id"));
    expect(line.route).toBe("/api/v1/projects/:id");
    expect(line.method).toBe("GET");
    expect(line.status).toBe(500);
    expect(line.error_code).toBe("DATABASE_ERROR");
    expect(String(line.error_message)).toContain("invalid input syntax for type uuid");
    expect(line.cause_code).toBe("22P02");
    expect(String(line.cause_message)).toContain("invalid input syntax for type uuid");

    // The request line still exists — one per request, no more.
    expect(requestLines()).toHaveLength(1);
    expect(requestLines()[0].status).toBe(500);
  });

  it("logs a non-AppError throw with its stack and still answers with the generic 500 body", async () => {
    vi.mocked(projectService.getById).mockRejectedValueOnce(new Error("kaboom-driver"));

    const res = await getProject(
      getRequest("http://localhost/api/v1/projects/" + PROJECT.id),
      { params: Promise.resolve({ id: PROJECT.id }) },
    );

    expect(res.status).toBe(500);
    expect(await res.text()).toBe(
      JSON.stringify({ error: { code: "ERROR", message: "An unexpected error occurred" } }),
    );

    const errors = errorLines();
    expect(errors).toHaveLength(1);
    expect(String(errors[0].error_message)).toContain("kaboom-driver");
    expect(String(errors[0].stack)).toContain("kaboom-driver");
  });
});

describe("successful request", () => {
  it("emits exactly one request line with status, duration, route template and user_id", async () => {
    vi.mocked(projectService.getById).mockResolvedValueOnce(PROJECT as never);

    const res = await getProject(
      getRequest("http://localhost/api/v1/projects/" + PROJECT.id + "?token=SENTINELQUERY"),
      { params: Promise.resolve({ id: PROJECT.id }) },
    );

    expect(res.status).toBe(200);

    const lines = requestLines();
    expect(lines).toHaveLength(1);
    const line = lines[0];
    expect(line.level).toBe("info");
    expect(line.method).toBe("GET");
    expect(line.route).toBe("/api/v1/projects/:id");
    expect(line.status).toBe(200);
    expect(line.user_id).toBe("user_123");
    expect(typeof line.duration_ms).toBe("number");
    expect(line.duration_ms as number).toBeGreaterThanOrEqual(0);
    expect(line.request_id).toBe(res.headers.get("x-request-id"));

    // Nothing but envelope facts: no query string, no path-parameter value.
    const serialized = JSON.stringify(captured);
    expect(serialized).not.toContain("SENTINELQUERY");
    expect(serialized).not.toContain(PROJECT.id);
  });
});

describe("privacy", () => {
  it("never emits request body, query string or auth-header values", async () => {
    vi.mocked(projectService.create).mockResolvedValueOnce({ id: PROJECT.id } as never);

    const res = await createProject(
      new NextRequest("http://localhost/api/v1/projects?access_token=SENTINELQUERY", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-token": "SENTINELHEADER",
        },
        body: JSON.stringify({
          name: "SENTINELBODY",
          description: "SENTINELDESCRIPTION",
        }),
      }),
    );

    expect(res.status).toBe(201);
    expect(requestLines()).toHaveLength(1);

    const serialized = JSON.stringify(captured);
    expect(serialized).not.toContain("SENTINELBODY");
    expect(serialized).not.toContain("SENTINELDESCRIPTION");
    expect(serialized).not.toContain("SENTINELQUERY");
    expect(serialized).not.toContain("SENTINELHEADER");
  });
});

describe("x-request-id", () => {
  it("generates an id when absent and echoes it on the response and both log lines", async () => {
    vi.mocked(projectService.getById).mockRejectedValueOnce(
      new DatabaseError("boom", { code: "XX000", message: "boom" }),
    );

    const res = await getProject(
      getRequest("http://localhost/api/v1/projects/" + PROJECT.id),
      { params: Promise.resolve({ id: PROJECT.id }) },
    );

    const header = res.headers.get("x-request-id");
    expect(header).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(requestLines()[0].request_id).toBe(header);
    expect(errorLines()[0].request_id).toBe(header);
  });

  it("honors an incoming x-request-id", async () => {
    vi.mocked(projectService.getById).mockResolvedValueOnce(PROJECT as never);

    const res = await getProject(
      getRequest("http://localhost/api/v1/projects/" + PROJECT.id, {
        "x-request-id": "req-inbound-123",
      }),
      { params: Promise.resolve({ id: PROJECT.id }) },
    );

    expect(res.headers.get("x-request-id")).toBe("req-inbound-123");
    expect(requestLines()[0].request_id).toBe("req-inbound-123");
  });
});

describe("LOG_LEVEL volume control", () => {
  it("silences request lines at warn but still emits 5xx error lines", async () => {
    process.env.LOG_LEVEL = "warn";

    vi.mocked(projectService.getById).mockRejectedValueOnce(
      new DatabaseError("boom", { code: "XX000", message: "boom" }),
    );
    const failed = await getProject(
      getRequest("http://localhost/api/v1/projects/" + PROJECT.id),
      { params: Promise.resolve({ id: PROJECT.id }) },
    );
    expect(failed.status).toBe(500);

    expect(requestLines()).toHaveLength(0);
    expect(errorLines()).toHaveLength(1);
    expect(errorLines()[0].status).toBe(500);
  });
});
