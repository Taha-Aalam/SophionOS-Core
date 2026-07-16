"use client";

import { useCallback, useEffect, useState } from "react";
import type { AiAccessSettings } from "@/lib/api/ai-access-policy";
import type { ApiKeyRecord } from "@/lib/api/api-key-service";

export type AiAccessKey = ApiKeyRecord & { status?: string };

export interface AiAccessState extends AiAccessSettings {
  keys: AiAccessKey[];
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json?.data as T;
}

export function useAiAccess() {
  const [data, setData] = useState<AiAccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const next = await apiFetch<AiAccessState>("/api/v1/user/ai-access");
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI access");
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- mount fetch */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const patchSettings = useCallback(
    async (patch: Partial<AiAccessSettings>) => {
      const next = await apiFetch<AiAccessSettings>("/api/v1/user/ai-access", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setData((prev) =>
        prev
          ? { ...prev, ...next }
          : { ...next, keys: [] },
      );
      return next;
    },
    [],
  );

  const disableAll = useCallback(async () => {
    const next = await apiFetch<AiAccessSettings & { revoked_count: number }>(
      "/api/v1/user/ai-access/disable-all",
      { method: "POST" },
    );
    setData((prev) => ({
      ai_access_enabled: next.ai_access_enabled,
      ai_write_access_enabled:
        next.ai_write_access_enabled ?? prev?.ai_write_access_enabled ?? false,
      privacy_notice_version:
        next.privacy_notice_version ?? prev?.privacy_notice_version ?? null,
      privacy_notice_accepted_at:
        next.privacy_notice_accepted_at ??
        prev?.privacy_notice_accepted_at ??
        null,
      keys: [],
    }));
    return next;
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    patchSettings,
    disableAll,
  };
}
