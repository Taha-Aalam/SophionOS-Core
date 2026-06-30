"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Plug, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ApiKeyRecord {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
  revoked_at: string | null;
}

/** Unwrap the standard `{ data }` envelope; throw the API error message otherwise. */
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

function buildClaudeDesktopConfig(apiKey: string, baseUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        lifeos: {
          command: "npx",
          args: ["-y", "@lifeos/mcp-server"],
          env: { LIFEOS_API_KEY: apiKey, LIFEOS_API_URL: baseUrl },
        },
      },
    },
    null,
    2,
  );
}

function buildClaudeCodeCommand(apiKey: string, baseUrl: string): string {
  return `claude mcp add lifeos --env LIFEOS_API_KEY=${apiKey} --env LIFEOS_API_URL=${baseUrl} -- npx -y @lifeos/mcp-server`;
}

const KEY_PLACEHOLDER = "lif_your_key_here";

export function McpSettingsContent() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://app.lifeos.app");

  // Resolve the live origin after mount. Kept in an effect (not a lazy
  // useState initializer) so SSR and the first client render agree on the
  // fallback — avoids a hydration mismatch in the rendered config snippets.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiFetch<ApiKeyRecord[]>("/api/v1/user/api-keys");
      setKeys(data ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load API keys",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Standard fetch-on-mount; loadKeys setStates async after the request lands.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function createKey() {
    const name = newKeyName.trim();
    if (!name) {
      toast.error("Give the key a name first.");
      return;
    }
    setCreating(true);
    try {
      const data = await apiFetch<{ key: string; record: ApiKeyRecord }>(
        "/api/v1/user/api-keys",
        { method: "POST", body: JSON.stringify({ name }) },
      );
      setRevealedKey(data.key);
      setNewKeyName("");
      toast.success("API key created. Copy it now — it won't be shown again.");
      await loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string, name: string) {
    if (!window.confirm(`Revoke the API key "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/api/v1/user/api-keys/${id}`, { method: "DELETE" });
      toast.success("API key revoked.");
      await loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy. Copy manually instead.");
    }
  }

  // Use the freshly revealed key in snippets if present; otherwise the most
  // recently created live key cannot expose its secret (only shown once), so
  // fall back to a placeholder the user replaces.
  const snippetKey = revealedKey ?? KEY_PLACEHOLDER;
  const activeKeys = keys.filter((k) => !k.revoked_at);
  const connected = activeKeys.some((k) => k.last_used_at);

  return (
    <div className="flex flex-col gap-6">
      {/* Connection status */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plug className="size-5 text-primary" />
              <CardTitle className="text-base">Connection status</CardTitle>
            </div>
            <Badge variant={connected ? "default" : "secondary"}>
              {connected ? "Connected" : "Not connected yet"}
            </Badge>
          </div>
          <CardDescription>
            {activeKeys.length === 0
              ? "Create an API key below, then add it to your AI client to connect LifeOS."
              : connected
                ? "An MCP client has used one of your keys. You're connected."
                : "You have an active key but no client has used it yet. Add it to your AI client."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* API keys */}
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            <CardTitle className="text-base">API keys</CardTitle>
          </div>
          <CardDescription>
            Keys authenticate your MCP server. Each key is shown once at
            creation — store it somewhere safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-key-name">New key name</Label>
              <Input
                id="new-key-name"
                placeholder="e.g. Claude Desktop"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createKey();
                }}
                disabled={creating}
              />
            </div>
            <Button onClick={() => void createKey()} disabled={creating}>
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Create key"
              )}
            </Button>
          </div>

          {revealedKey && (
            <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
              <p className="mb-2 text-sm font-medium">
                Your new key (copy it now — it won&apos;t be shown again):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                  {revealedKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copy("revealed", revealedKey)}
                >
                  {copied === "revealed" ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading keys…</p>
          ) : activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active keys yet.
            </p>
          ) : (
            <ul className="divide-y">
              {activeKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.last_used_at
                        ? `Last used ${new Date(k.last_used_at).toLocaleString()}`
                        : "Never used"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void revokeKey(k.id, k.name)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Setup snippets */}
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Connect your AI client</CardTitle>
          <CardDescription>
            Copy a config below into your MCP client.
            {!revealedKey &&
              " Replace lif_your_key_here with a key you created above."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Claude Desktop (claude_desktop_config.json)</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void copy(
                    "desktop",
                    buildClaudeDesktopConfig(snippetKey, baseUrl),
                  )
                }
              >
                {copied === "desktop" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                <span className="ml-1">Copy</span>
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
              {buildClaudeDesktopConfig(snippetKey, baseUrl)}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Claude Code (terminal)</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void copy(
                    "code",
                    buildClaudeCodeCommand(snippetKey, baseUrl),
                  )
                }
              >
                {copied === "code" ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                <span className="ml-1">Copy</span>
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
              {buildClaudeCodeCommand(snippetKey, baseUrl)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
