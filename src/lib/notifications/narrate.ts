import type { SupabaseClient } from "@supabase/supabase-js";
import {
  userSettingsService,
  type NotificationSettings,
} from "@/lib/services/user-settings.service";
import {
  generateCompletion,
} from "@/lib/ai/gateway";
import { buildBriefPrompt } from "@/lib/ai/brief-prompt";
import type { ProviderId } from "@/lib/ai/provider-registry";
import type { TodayData } from "@/lib/services/dashboard.service";
import type { BriefKind } from "./types";

// Optional AI narration step for briefs. Contract with the dispatch loop:
// resolve to a summary or NULL — every disabled/unconfigured/error/deadline
// path returns null and the deterministic brief goes out unchanged. A thrown
// narration must never block or fail an email (SPEC-brief-narration.md).

export const NARRATION_TIMEOUT_MS = 12_000;
/** Run-deadline guard: stop narrating this close to the cron route budget. */
export const NARRATION_DEADLINE_MARGIN_MS = 10_000;
const NARRATION_MAX_TOKENS = 700;

export interface NarrationInput {
  userId: string;
  kind: BriefKind;
  today: TodayData;
  localDate: string;
  /** Epoch ms when the cron run must finish; narration declines near it. */
  deadlineAt?: number;
}

export interface NarrationOutcome {
  text: string;
  provider: string;
  model: string;
}

interface NarrateOptions {
  supabase: SupabaseClient;
  fetchImpl?: typeof fetch;
}

export async function narrateBrief(
  input: NarrationInput,
  options: NarrateOptions,
): Promise<NarrationOutcome | null> {
  try {
    if (
      input.deadlineAt !== undefined &&
      Date.now() + NARRATION_DEADLINE_MARGIN_MS > input.deadlineAt
    ) {
      return null;
    }

    const prefs = await userSettingsService.get<NotificationSettings>(
      input.userId,
      "notifications",
      { supabase: options.supabase },
    );
    if (!prefs || typeof prefs !== "object") return null;
    if (prefs.ai_narration_enabled !== true) return null;

    const { system, prompt } = buildBriefPrompt(
      input.kind,
      input.today,
      input.localDate,
    );
    const result = await generateCompletion(
      {
        userId: input.userId,
        purpose: "brief_narration",
        system,
        prompt,
        maxTokens: NARRATION_MAX_TOKENS,
        timeoutMs: NARRATION_TIMEOUT_MS,
        provider: (prefs.ai_narration_provider ?? undefined) as
          | ProviderId
          | undefined,
        model: prefs.ai_narration_model ?? undefined,
      },
      { supabase: options.supabase, fetchImpl: options.fetchImpl },
    );

    const text = result.text.trim();
    if (!text) return null;
    return { text, provider: result.provider, model: result.model };
  } catch (err) {
    // Any narration failure degrades to the deterministic brief. Log the
    // error class only — never prompt or key material.
    console.warn(
      `[briefs] narration unavailable (${err instanceof Error ? err.name : "unknown"}), using deterministic brief`,
    );
    return null;
  }
}
