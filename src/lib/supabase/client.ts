"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    Clerk?: {
      loaded?: boolean;
      load?: () => Promise<unknown>;
      session?: { getToken: () => Promise<string | null> };
    };
  }
}

// On a hard refresh the Clerk browser SDK is not yet ready when the first data
// queries (and the default-area seed) fire — AuthProvider seeds `user` from the
// server-resolved id so `enabled: !!user` is true on the first client paint. If
// accessToken() returns null in that window, supabase-js falls back to the
// publishable key as the bearer, the request hits PostgREST as `anon`, and every
// RLS `to authenticated` policy denies it (401 / 42501) or returns zero rows.
// That surfaced as goals/projects/tasks randomly missing and a failing area seed
// on refresh, recovering only after Clerk finished loading.
//
// `Clerk.loaded` flips true a beat before `session.getToken()` actually yields a
// token, so waiting on `loaded` is not enough. Wait for the real artifact: poll
// getToken() until it returns a non-null token. Once Clerk is ready getToken()
// resolves from cache instantly, so the wait only costs anything during the cold
// load. A timeout backstops a genuinely signed-out session so requests never hang.
const CLERK_TOKEN_TIMEOUT_MS = 10000;
const CLERK_POLL_INTERVAL_MS = 50;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveClerkToken(): Promise<string | null> {
  const deadline = Date.now() + CLERK_TOKEN_TIMEOUT_MS;

  // Kick the SDK if the global is attached but not yet loaded.
  if (window.Clerk && !window.Clerk.loaded && typeof window.Clerk.load === "function") {
    try {
      await window.Clerk.load();
    } catch {
      // Ignore — polling below still waits for the session to come up.
    }
  }

  while (Date.now() < deadline) {
    const token = await window.Clerk?.session?.getToken();
    if (token) return token;
    await delay(CLERK_POLL_INTERVAL_MS);
  }

  // Timed out (e.g. genuinely signed-out session). Return whatever we have so
  // the request proceeds rather than hanging forever.
  return (await window.Clerk?.session?.getToken()) ?? null;
}

export const createClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return resolveClerkToken();
      },
    },
  );
