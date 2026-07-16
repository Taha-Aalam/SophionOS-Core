import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clearTierCache } from "@/lib/api/subscription";

/**
 * Billing webhook receiver (provider-agnostic skeleton).
 *
 * SEC-2026-005: Verifies a shared HMAC (or bearer) secret before mutating
 * entitlements. Wire the concrete provider (Dodo/Stripe/etc.) event shapes here
 * when checkout goes live. Until then this route rejects unsigned payloads.
 *
 * Configure:
 *   BILLING_WEBHOOK_SECRET — required
 *   Header: x-billing-signature = hex(hmac_sha256(rawBody, secret))
 *   Or Authorization: Bearer <BILLING_WEBHOOK_SECRET>
 */

export const runtime = "nodejs";

type BillingEvent = {
  id: string;
  type: string;
  user_id?: string;
  tier?: "free" | "pro" | "lifetime" | "max";
  status?: "active" | "past_due" | "canceled";
  data?: Record<string, unknown>;
};

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function verifySignature(rawBody: string, request: NextRequest, secret: string): boolean {
  const bearer = request.headers.get("authorization");
  if (bearer?.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice(7).trim();
    if (token && safeEqual(token, secret)) return true;
  }

  const sig = request.headers.get("x-billing-signature")?.trim();
  if (!sig) return false;

  const hmac = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(sig, hmac);
}

async function applyEntitlement(event: BillingEvent): Promise<void> {
  if (!event.user_id || !event.tier) return;

  const admin = createAdminClient();
  const status = event.status ?? "active";

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: event.user_id,
      tier: event.tier,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  clearTierCache();
}

export async function POST(request: NextRequest) {
  const secret = process.env.BILLING_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "Billing webhook secret not configured" } },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request, secret)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid webhook signature" } },
      { status: 401 },
    );
  }

  let event: BillingEvent;
  try {
    event = JSON.parse(rawBody) as BillingEvent;
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (!event?.id || !event?.type) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Missing event id/type" } },
      { status: 400 },
    );
  }

  // Idempotency via billing_events when the table exists.
  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("billing_events")
      .select("id")
      .eq("provider_event_id", event.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ data: { ok: true, duplicate: true } });
    }
  } catch {
    // Table may not exist yet in older environments.
  }

  try {
    if (
      event.type === "subscription.updated" ||
      event.type === "subscription.created" ||
      event.type === "checkout.completed"
    ) {
      await applyEntitlement(event);
    }

    try {
      const admin = createAdminClient();
      await admin.from("billing_events").insert({
        provider_event_id: event.id,
        event_type: event.type,
        user_id: event.user_id ?? null,
        payload: event,
      });
    } catch {
      // Optional audit table.
    }

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    console.error("[billing.webhook]", err instanceof Error ? err.message : "error");
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Webhook processing failed" } },
      { status: 500 },
    );
  }
}
