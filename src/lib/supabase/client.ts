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

// On a hard refresh the Clerk browser SDK is not yet loaded when the first data
// queries fire — AuthProvider seeds `user` from the server-resolved id so
// `enabled: !!user` is true on the first client paint. If accessToken() returned
// null in that window the request went out unauthenticated, RLS returned zero
// rows, and the empty result was cached (the query key never changes once Clerk
// loads, so nothing refetches). That surfaced as goals/projects/tasks randomly
// missing on refresh until a later unrelated invalidation. Block here until
// Clerk is loaded, with a timeout so a stalled load can never hang every request.
const CLERK_READY_TIMEOUT_MS = 5000;
const CLERK_POLL_INTERVAL_MS = 50;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForClerkLoaded(): Promise<void> {
  const deadline = Date.now() + CLERK_READY_TIMEOUT_MS;

  // The global itself may not be attached yet on a cold load.
  while (!window.Clerk && Date.now() < deadline) {
    await delay(CLERK_POLL_INTERVAL_MS);
  }

  const clerk = window.Clerk;
  if (!clerk || clerk.loaded) return;

  if (typeof clerk.load === "function") {
    try {
      await clerk.load();
    } catch {
      // Fall through to polling — load() failing doesn't mean Clerk won't ready.
    }
  }

  while (!window.Clerk?.loaded && Date.now() < deadline) {
    await delay(CLERK_POLL_INTERVAL_MS);
  }
}

export const createClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        await waitForClerkLoaded();
        return (await window.Clerk?.session?.getToken()) ?? null;
      },
    },
  );
