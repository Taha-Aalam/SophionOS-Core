/**
 * Configuration + authentication for the SophionOS MCP server.
 *
 * The user supplies two values via environment variables (set in their MCP
 * client config): the SophionOS API key and the app base URL. On startup the
 * server validates the key by calling `GET /api/v1/mcp/health` — a 200 means
 * the key resolves to a Clerk user id server-side AND that user is on a paid
 * tier (Pro/lifetime/max). A 403 means the key is valid but the tier is Free,
 * so the server refuses to start with an upgrade message.
 */

import { SophionOSClient } from "./client.js";
import { SophionOSApiError } from "./types.js";

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://app.sophionos.com";

/** Read config from the environment. Throws with actionable messages. */
export function resolveConfig(env = process.env): ResolvedConfig {
  const apiKey = env.SOPHIONOS_API_KEY?.trim();
  const baseUrl = (env.SOPHIONOS_API_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (!apiKey) {
    throw new Error(
      "SOPHIONOS_API_KEY is not set. Create a key in SophionOS (Settings → MCP) and add it to your MCP client config as the SOPHIONOS_API_KEY environment variable.",
    );
  }
  if (!apiKey.startsWith("sop_")) {
    throw new Error(
      'SOPHIONOS_API_KEY does not look like a SophionOS key (expected a "sop_" prefix).',
    );
  }

  return { apiKey, baseUrl };
}

/**
 * Validate the API key against the live API. Returns the authenticated client
 * on success; throws a descriptive Error on failure so the server can refuse
 * to start.
 */
export async function authenticate(config: ResolvedConfig): Promise<SophionOSClient> {
  const client = new SophionOSClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  try {
    await client.user.health();
  } catch (err) {
    if (err instanceof SophionOSApiError) {
      if (err.status === 401) {
        throw new Error(
          "SophionOS API key rejected (401). The key may be revoked or invalid. Generate a new one in SophionOS → Settings → MCP.",
        );
      }
      if (err.status === 403) {
        throw new Error(
          "SophionOS MCP access requires a Pro subscription. Your key is valid but your account is on the Free tier. Upgrade to Pro in SophionOS → Settings to enable the API and MCP server.",
        );
      }
      throw new Error(
        `SophionOS API validation failed (${err.status} ${err.code}): ${err.message}`,
      );
    }
    throw new Error(
      `Could not reach the SophionOS API at ${config.baseUrl}. Check SOPHIONOS_API_URL and your network. Cause: ${
        (err as Error).message
      }`,
    );
  }

  return client;
}
