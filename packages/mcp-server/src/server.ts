/**
 * MCP server factory. Builds an McpServer, registers every tool group against
 * an authenticated LifeOS client. Kept cheap and side-effect-free so the entry
 * point can construct then connect a transport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LifeOSClient } from "./client.js";
import { registerCoreTools } from "./tools/core.js";
import { registerKnowledgeTools } from "./tools/knowledge.js";
import { registerLinkTools } from "./tools/links.js";

export const SERVER_NAME = "lifeos";
export const SERVER_VERSION = "0.1.0";

export function createServer(client: LifeOSClient): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerCoreTools(server, client);
  registerKnowledgeTools(server, client);
  registerLinkTools(server, client);

  return server;
}
