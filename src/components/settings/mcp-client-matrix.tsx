"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MCP_CLIENTS,
  type McpClientId,
} from "@/lib/mcp/client-configs";

const PLACEHOLDER_KEY = "sop_your_key_here";

interface McpClientMatrixProps {
  baseUrl: string;
}

export function McpClientMatrix({ baseUrl }: McpClientMatrixProps) {
  const [activeId, setActiveId] = useState<McpClientId>(MCP_CLIENTS[0].id);
  const [copied, setCopied] = useState(false);

  const active = MCP_CLIENTS.find((c) => c.id === activeId) ?? MCP_CLIENTS[0];
  const snippet = active.build(PLACEHOLDER_KEY, baseUrl);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy. Copy manually instead.");
    }
  }

  function onSelectChange(value: string) {
    setActiveId(value as McpClientId);
    setCopied(false);
  }

  return (
    <div className="space-y-4">
      {/* Mobile / small: select */}
      <div className="md:hidden space-y-1.5">
        <Label htmlFor="mcp-client-select">AI client</Label>
        <select
          id="mcp-client-select"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={activeId}
          onChange={(e) => onSelectChange(e.target.value)}
        >
          {MCP_CLIENTS.map((client) => (
            <option key={client.id} value={client.id}>
              {client.label}
            </option>
          ))}
        </select>
      </div>

      {/* md+: tabs (snippet rendered below; panels only keep a11y association) */}
      <Tabs
        value={activeId}
        onValueChange={onSelectChange}
        className="hidden md:flex"
      >
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-1"
        >
          {MCP_CLIENTS.map((client) => (
            <TabsTrigger
              key={client.id}
              value={client.id}
              className="text-xs"
            >
              {client.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeId} className="mt-0 sr-only">
          {active.label}
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <Label className="text-sm font-medium">{active.label}</Label>
            <p className="text-xs text-muted-foreground">{active.pathHint}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void copySnippet()}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span className="ml-1">Copy</span>
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">
          {snippet}
        </pre>
        <p className="text-xs text-muted-foreground">{active.afterPasteHint}</p>
      </div>

      <p className="text-xs text-muted-foreground">
        Works with any client that supports stdio MCP servers. Replace{" "}
        <code className="rounded bg-muted px-1">{PLACEHOLDER_KEY}</code> with
        your API key. Self-hosted: set{" "}
        <code className="rounded bg-muted px-1">SOPHIONOS_API_URL</code> to your
        instance origin (already filled from this app).
      </p>
    </div>
  );
}
