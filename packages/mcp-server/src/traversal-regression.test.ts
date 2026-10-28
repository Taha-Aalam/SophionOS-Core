import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "./server.js";
import { SophionOSClient } from "./client.js";

// Regression tests for audit finding
// `packages/mcp-server/src/client.ts:buildUrl-unvalidated-id-path-interpolation`:
// tool schemas declared ids as bare z.string() and client.ts interpolated
// them raw into REST path templates; new URL() resolves dot segments, so a
// traversal id redirected the request to a different route under the user's
// Bearer key (e.g. get_note {id:"../user/export"} -> GET /api/v1/user/export,
// delete_entity {id:"../user/integrations/<uuid>"} -> durable delete on a
// route no tool exposes). Tool-controlled ids must be single URL path
// segments, and buildUrl must refuse paths whose segments leave the tool's
// route family.

const REDIRECTED_CALLS: Array<{ method: string; url: string }> = [];

const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
  REDIRECTED_CALLS.push({
    method: String(init?.method ?? "GET"),
    url: String(url),
  });
  return new Response(JSON.stringify({ data: { probe: true } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;

const api = new SophionOSClient({
  baseUrl: "https://app.example.test",
  apiKey: "sop_local_dummy_key",
  fetchImpl,
});

describe("MCP tool ids cannot redirect requests outside their route", () => {
  it("get_note with a traversal id never reaches /user/export", async () => {
    REDIRECTED_CALLS.length = 0;
    const server = createServer(api);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const mcp = new Client({ name: "probe", version: "0.0.0" });
    await mcp.connect(clientTransport);
    let result: unknown;
    try {
      result = await mcp.callTool({
        name: "get_note",
        arguments: { id: "../user/export" },
      });
    } finally {
      await mcp.close();
    }
    // The traversal id is rejected outright (schema/handler error), and no
    // request leaves the tool's own route family.
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(REDIRECTED_CALLS.filter((c) => c.url.includes("/api/v1/user/"))).toHaveLength(0);
  });

  it("delete_entity with a traversal id never reaches /user/integrations/:id", async () => {
    REDIRECTED_CALLS.length = 0;
    const server = createServer(api);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const mcp = new Client({ name: "probe", version: "0.0.0" });
    await mcp.connect(clientTransport);
    let result: unknown;
    try {
      result = await mcp.callTool({
        name: "delete_entity",
        arguments: {
          entity: "task",
          id: "../user/integrations/11111111-1111-1111-1111-111111111111",
        },
      });
    } finally {
      await mcp.close();
    }
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(REDIRECTED_CALLS.filter((c) => c.url.includes("/api/v1/user/"))).toHaveLength(0);
  });

  it("update_task with a traversal id never reaches /user/settings", async () => {
    REDIRECTED_CALLS.length = 0;
    const server = createServer(api);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const mcp = new Client({ name: "probe", version: "0.0.0" });
    await mcp.connect(clientTransport);
    let result: unknown;
    try {
      result = await mcp.callTool({
        name: "update_task",
        arguments: { id: "../user/settings", name: "probe" },
      });
    } finally {
      await mcp.close();
    }
    expect((result as { isError?: boolean }).isError).toBe(true);
    expect(REDIRECTED_CALLS.filter((c) => c.url.includes("/api/v1/user/"))).toHaveLength(0);
  });

  it("buildUrl refuses dot segments even when called directly", () => {
    expect(() =>
      // @ts-expect-error exercising the private method through a cast
      api["buildUrl"].call(api, "/notes/../user/export"),
    ).toThrow();
  });

  it("a normal uuid id still reaches its own route", async () => {
    REDIRECTED_CALLS.length = 0;
    await api.notes.get("44444444-4444-4444-8444-444444444444");
    expect(REDIRECTED_CALLS).toHaveLength(1);
    expect(REDIRECTED_CALLS[0].url).toBe(
      "https://app.example.test/api/v1/notes/44444444-4444-4444-8444-444444444444",
    );
  });
});
