import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createDefaultBriefDispatchDeps,
  runBriefDispatch,
} from "@/lib/notifications/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Timing-safe comparison of the cron secret — mirrors the billing webhook
// pattern, so request timing cannot be used to recover the secret byte by
// byte.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function bearerToken(header: string | null): string | null {
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = bearerToken(request.headers.get("authorization"))
    ?? request.headers.get("x-cron-secret");
  return provided ? safeEqual(provided, secret) : false;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const deps = createDefaultBriefDispatchDeps(admin);
    const result = await runBriefDispatch(deps);
    // Overall run returns 200; per-candidate outcomes are in the result
    // (failures lists the candidate user ids that could not be processed).
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "dispatch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
