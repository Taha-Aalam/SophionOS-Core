"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderCredentialMeta } from "@/lib/services/provider-credentials.service";

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json?.data as T;
}

export interface ConnectProviderPayload {
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
  label?: string | null;
}

export function useAiProviders() {
  const [providers, setProviders] = useState<ProviderCredentialMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<ProviderCredentialMeta[]>(
        "/api/v1/user/ai-providers",
      );
      setProviders(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load AI providers",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- mount fetch */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const connect = useCallback(async (payload: ConnectProviderPayload) => {
    const meta = await apiFetch<ProviderCredentialMeta>(
      "/api/v1/user/ai-providers",
      { method: "PUT", body: JSON.stringify(payload) },
    );
    setProviders((prev) => [
      meta,
      ...prev.filter((p) => p.provider !== meta.provider),
    ]);
    return meta;
  }, []);

  const disconnect = useCallback(async (provider: string) => {
    await apiFetch(`/api/v1/user/ai-providers?provider=${provider}`, {
      method: "DELETE",
    });
    setProviders((prev) => prev.filter((p) => p.provider !== provider));
  }, []);

  return { providers, loading, error, refresh, connect, disconnect };
}
