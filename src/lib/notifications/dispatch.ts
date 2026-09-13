import type { SupabaseClient } from "@supabase/supabase-js";
import type { TodayData } from "@/lib/services/dashboard.service";
import { dashboardService } from "@/lib/services/dashboard.service";
import { composeBriefEmail, type ComposedEmail } from "./compose-brief";
import {
  hasTerminalDelivery as hasTerminalDeliveryDb,
  recordDelivery as recordDeliveryDb,
} from "./delivery-log";
import { sendBriefEmail } from "./email";
import { kindsDueForUser, type NotificationPrefs } from "./schedule";
import { resolveUserEmail } from "./resolve-email";
import type { BriefKind, DeliveryStatus } from "./types";

const MAX_SENDS_PER_RUN = 50;
const DEFAULT_WINDOW_MINUTES = 15;

export interface BriefDispatchDeps {
  listNotificationCandidates: () => Promise<
    Array<{
      userId: string;
      prefs: NotificationPrefs;
      timezone: string;
    }>
  >;
  hasTerminalDelivery: (args: {
    userId: string;
    kind: BriefKind;
    localDate: string;
  }) => Promise<boolean>;
  loadToday: (userId: string) => Promise<TodayData>;
  resolveEmail: (userId: string) => Promise<string | null>;
  sendEmail: (args: {
    to: string;
    mail: ComposedEmail;
  }) => Promise<{ id: string | null }>;
  recordDelivery: (args: {
    userId: string;
    kind: BriefKind;
    localDate: string;
    status: DeliveryStatus;
    error?: string | null;
    payload?: Record<string, unknown> | null;
  }) => Promise<void>;
  appUrl: string;
  windowMinutes: number;
  now?: Date;
  maxSendsPerRun?: number;
}

export interface BriefDispatchResult {
  candidates: number;
  due: number;
  sent: number;
  skipped: number;
  failed: number;
  /** Candidate user ids whose processing failed (loop-isolation outcomes). */
  failures: string[];
}

export async function runBriefDispatch(
  deps: BriefDispatchDeps,
): Promise<BriefDispatchResult> {
  const now = deps.now ?? new Date();
  const maxSends = deps.maxSendsPerRun ?? MAX_SENDS_PER_RUN;
  const result: BriefDispatchResult = {
    candidates: 0,
    due: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  const candidates = await deps.listNotificationCandidates();
  result.candidates = candidates.length;

  let sendAttempts = 0;

  for (const candidate of candidates) {
    if (sendAttempts >= maxSends) break;

    // Per-candidate isolation: one stale candidate (bad prefs shape, DB
    // hiccup on its dedupe/email lookups) must not abort the whole run and
    // 500 the endpoint for every other user. The catch records the failure
    // and moves on; the response reports per-candidate outcomes.
    try {
      const dueList = kindsDueForUser({
        prefs: candidate.prefs,
        timezone: candidate.timezone,
        now,
        windowMinutes: deps.windowMinutes,
      });

      for (const due of dueList) {
        if (sendAttempts >= maxSends) break;
        result.due += 1;

        let already: boolean;
        try {
          already = await deps.hasTerminalDelivery({
            userId: candidate.userId,
            kind: due.kind,
            localDate: due.localDate,
          });
        } catch (err) {
          console.error(
            `[briefs] dedupe check failed for candidate ${candidate.userId}`,
            err,
          );
          result.failed += 1;
          result.failures.push(candidate.userId);
          continue;
        }
        if (already) {
          result.skipped += 1;
          continue;
        }

        sendAttempts += 1;

        let email: string | null | undefined;
        try {
          email = await deps.resolveEmail(candidate.userId);
        } catch (err) {
          console.error(
            `[briefs] email lookup failed for candidate ${candidate.userId}`,
            err,
          );
          await bestEffortRecordDelivery(deps, candidate.userId, due.kind, due.localDate, {
            status: "failed",
            error: "email_lookup_failed",
          });
          result.failed += 1;
          result.failures.push(candidate.userId);
          continue;
        }
        if (!email) {
          await bestEffortRecordDelivery(deps, candidate.userId, due.kind, due.localDate, {
            status: "skipped",
            error: "no_email",
          });
          result.skipped += 1;
          continue;
        }

        try {
          const today = await deps.loadToday(candidate.userId);
          const mail = composeBriefEmail({
            kind: due.kind,
            today,
            appUrl: deps.appUrl,
            localDate: due.localDate,
          });
          const sendResult = await deps.sendEmail({ to: email, mail });
          await bestEffortRecordDelivery(deps, candidate.userId, due.kind, due.localDate, {
            status: "sent",
            payload: {
              resend_id: sendResult.id,
              configured_time: due.configuredTime,
            },
          });
          result.sent += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : "send_failed";
          await bestEffortRecordDelivery(deps, candidate.userId, due.kind, due.localDate, {
            status: "failed",
            error: message,
          });
          result.failed += 1;
          result.failures.push(candidate.userId);
        }
      }
    } catch (err) {
      console.error(
        `[briefs] candidate processing failed for ${candidate.userId}`,
        err,
      );
      result.failed += 1;
      result.failures.push(candidate.userId);
    }
  }

  return result;
}

/** Records a delivery outcome; a failing write must not abort the run. */
async function bestEffortRecordDelivery(
  deps: BriefDispatchDeps,
  userId: string,
  kind: BriefKind,
  localDate: string,
  args: {
    status: DeliveryStatus;
    error?: string | null;
    payload?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await deps.recordDelivery({
      userId,
      kind,
      localDate,
      ...args,
    });
  } catch (err) {
    console.error(`[briefs] delivery record failed for ${userId}`, err);
  }
}

function parsePrefs(value: unknown): NotificationPrefs | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as NotificationPrefs;
}

function parseTimezone(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "UTC";
  const tz = (value as { timezone?: unknown }).timezone;
  return typeof tz === "string" && tz.trim() ? tz.trim() : "UTC";
}

export async function listNotificationCandidates(
  supabase: SupabaseClient,
): Promise<
  Array<{ userId: string; prefs: NotificationPrefs; timezone: string }>
> {
  const [{ data: notifRows, error: notifErr }, { data: prefRows, error: prefErr }] =
    await Promise.all([
      supabase
        .from("user_settings")
        .select("user_id, value")
        .eq("key", "notifications"),
      supabase
        .from("user_settings")
        .select("user_id, value")
        .eq("key", "preferences"),
    ]);

  if (notifErr) throw notifErr;
  if (prefErr) throw prefErr;

  const tzByUser = new Map<string, string>();
  for (const row of prefRows ?? []) {
    if (row.user_id) {
      tzByUser.set(row.user_id as string, parseTimezone(row.value));
    }
  }

  const out: Array<{
    userId: string;
    prefs: NotificationPrefs;
    timezone: string;
  }> = [];

  for (const row of notifRows ?? []) {
    const userId = row.user_id as string | null;
    if (!userId) continue;
    const prefs = parsePrefs(row.value);
    if (!prefs) continue;
    out.push({
      userId,
      prefs,
      timezone: tzByUser.get(userId) ?? "UTC",
    });
  }

  return out;
}

export function createDefaultBriefDispatchDeps(
  admin: SupabaseClient,
): BriefDispatchDeps {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return {
    listNotificationCandidates: () => listNotificationCandidates(admin),
    hasTerminalDelivery: (args) => hasTerminalDeliveryDb(admin, args),
    loadToday: (userId) =>
      dashboardService.getToday(userId, { supabase: admin }),
    resolveEmail: resolveUserEmail,
    sendEmail: ({ to, mail }) => sendBriefEmail({ to, mail }),
    recordDelivery: (args) => recordDeliveryDb(admin, args),
    appUrl,
    windowMinutes: DEFAULT_WINDOW_MINUTES,
  };
}
