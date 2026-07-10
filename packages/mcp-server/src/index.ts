#!/usr/bin/env node
/**
 * SophionOS MCP server entry point (stdio transport).
 *
 * Reads config from the environment (SOPHIONOS_API_KEY, SOPHIONOS_API_URL),
 * validates the key against the live API, then serves over stdio for clients
 * like Claude Desktop / Claude Code. Diagnostics go to stderr — stdout is
 * reserved for the JSON-RPC protocol stream.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { authenticate, resolveConfig } from "./auth.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

async function main(): Promise<void> {
  const config = resolveConfig();
  const client = await authenticate(config);

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `${SERVER_NAME} MCP server v${SERVER_VERSION} connected (stdio) → ${config.baseUrl}\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write(
    `Fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
