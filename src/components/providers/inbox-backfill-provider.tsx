"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useRef } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { noteService } from "@/lib/services/note.service";
import { projectService } from "@/lib/services/project.service";
import { resourceService } from "@/lib/services/resource.service";
import { taskService } from "@/lib/services/task.service";

const SESSION_FLAG = "inbox-backfill:v3";
const MUTATION_DEBOUNCE_MS = 800;

const ENTITY_QUERY_KEYS = ["tasks", "projects", "notes", "resources", "goals", "areas", "topics", "contacts"] as const;

interface InboxBackfillProviderProps {
  children: React.ReactNode;
}

/**
 * Global trigger for the inbox backfill sweep.
 *
 * - On mount, runs the four `backfillStaleStatuses` services once per
 *   session (sessionStorage flag). Catches rows whose stored status
 *   doesn't match the value derived from their current context, across
 *   every entity type the user has data for.
 * - On every successful React Query mutation, schedules a debounced
 *   re-run. This covers create / update / delete of areas, goals,
 *   projects, tasks, notes, resources, topics, and contacts — anything
 *   that can shift a row's context. The debounce coalesces bursts of
 *   mutations (e.g. a single user action that writes 3+ rows) into
 *   one backfill pass.
 *
 * Both passes are best-effort. A failure releases the session flag so
 * a future page load retries.
 */
export function InboxBackfillProvider({ children }: InboxBackfillProviderProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<unknown> | null>(null);

  // Stable references so the mutation-cache subscription can read them
  // without re-subscribing on every render. The refs themselves hold
  // the latest snapshots; sync is done in effects (not in render) to
  // satisfy `react-hooks/refs`. `useEffectEvent` then gives effect
  // bodies a stable identity that always reads the freshest value.
  const userIdRef = useRef<string | undefined>(userId);
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  // `useEffectEvent` wraps `runBackfill` so it can be called from
  // effect bodies (and event handlers in effects) without re-firing
  // those effects when `runBackfill` would otherwise be a fresh
  // closure on every render.
  const runBackfill = useEffectEvent(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (inFlightRef.current) return inFlightRef.current;

    inFlightRef.current = Promise.all([
      taskService.backfillStaleStatuses(uid),
      projectService.backfillStaleStatuses(uid),
      noteService.backfillStaleStatuses(uid),
      resourceService.backfillStaleStatuses(uid),
    ])
      .then((counts) => {
        const total = counts.reduce((sum, c) => sum + c, 0);
        if (total > 0) {
          for (const key of ENTITY_QUERY_KEYS) {
            queryClientRef.current.invalidateQueries({ queryKey: [key] });
          }
        }
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    return inFlightRef.current;
  });

  // ── On mount: one-shot per session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!userId) return;
    if (window.sessionStorage.getItem(SESSION_FLAG)) return;
    window.sessionStorage.setItem(SESSION_FLAG, "1");
    void runBackfill().catch(() => {
      window.sessionStorage.removeItem(SESSION_FLAG);
    });
    // We intentionally omit `runBackfill` from deps; it is stable
    // because it is a `useEffectEvent` callback.
  }, [userId]);

  // ── Subscribe to the mutation cache: run on any successful mutation.
  useEffect(() => {
    if (!userId) return;
    const cache = queryClient.getMutationCache();
    const unsubscribe = cache.subscribe((event) => {
      if (event.type !== "updated") return;
      const mutation = event.mutation;
      // Only react to fully-settled successes.
      if (mutation.state.status !== "success") return;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void runBackfill().catch(() => {
          // Best-effort: a failed mutation-triggered pass is retried on
          // the next mutation. No session-flag reset because the on-mount
          // sweep already ran (or is queued).
        });
      }, MUTATION_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // `runBackfill` is stable (useEffectEvent), so it is safe to omit
    // from deps.
  }, [userId, queryClient]);

  return <>{children}</>;
}
