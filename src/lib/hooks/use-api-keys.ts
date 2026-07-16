"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiKeyRecord } from "@/lib/api/api-key-service";

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

export interface CreateApiKeyPayload {
  name: string;
  client_type?: "mcp" | "automation" | "personal" | "unknown";
  client_name?: string | null;
  access_mode?: "read_only" | "write_limited" | "write_enabled";
  expires_at?: string | null;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<ApiKeyRecord[]>("/api/v1/user/api-keys");
      setKeys(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createKey = useCallback(async (payload: CreateApiKeyPayload) => {
    const data = await apiFetch<{ key: string; record: ApiKeyRecord }>(
      "/api/v1/user/api-keys",
      { method: "POST", body: JSON.stringify(payload) },
    );
    setKeys((prev) => [data.record, ...prev.filter((k) => k.id !== data.record.id)]);
    return data;
  }, []);

  const revokeKey = useCallback(async (id: string) => {
    await apiFetch(`/api/v1/user/api-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const updateKey = useCallback(
    async (
      id: string,
      patch: {
        name?: string;
        access_mode?: "read_only" | "write_limited" | "write_enabled";
        client_name?: string | null;
        expires_at?: string | null;
      },
    ) => {
      const record = await apiFetch<ApiKeyRecord>(`/api/v1/user/api-keys/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setKeys((prev) => prev.map((k) => (k.id === id ? record : k)));
      return record;
    },
    [],
  );

  return {
    keys,
    loading,
    error,
    refresh,
    createKey,
    revokeKey,
    updateKey,
  };
}
