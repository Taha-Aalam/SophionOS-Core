import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/notifications/dispatch", () => ({
  createDefaultBriefDispatchDeps: vi.fn(() => ({ mocked: true })),
  runBriefDispatch: vi.fn(async () => ({
    candidates: 0,
    due: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  })),
}));

import { POST } from "./route";
import { runBriefDispatch } from "@/lib/notifications/dispatch";

describe("POST /api/cron/briefs", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 without valid secret", async () => {
    const req = new NextRequest("http://localhost/api/cron/briefs", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(runBriefDispatch).not.toHaveBeenCalled();
  });

  it("returns 401 with wrong secret", async () => {
    const req = new NextRequest("http://localhost/api/cron/briefs", {
      method: "POST",
      headers: { Authorization: "Bearer wrong" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("runs dispatch with valid Bearer secret", async () => {
    const req = new NextRequest("http://localhost/api/cron/briefs", {
      method: "POST",
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result).toEqual({
      candidates: 0,
      due: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    });
    expect(runBriefDispatch).toHaveBeenCalledTimes(1);
  });

  it("accepts x-cron-secret header", async () => {
    const req = new NextRequest("http://localhost/api/cron/briefs", {
      method: "POST",
      headers: { "x-cron-secret": "test-cron-secret" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
