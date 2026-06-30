/**
 * Configuration + authentication for the LifeOS MCP server.
 *
 * The user supplies two values via environment variables (set in their MCP
 * client config): the LifeOS API key and the app base URL. On startup the
 * server validates the key by calling `GET /api/v1/user/settings` — a 200
 * means the key resolves to a Clerk user id server-side.
 */

import { LifeOSClient } from "./client.js";
import { LifeOSApiError } from "./types.js";

export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = "https://app.lifeos.app";

/** Read config from the environment. Throws with actionable messages. */
export function resolveConfig(env = process.env): ResolvedConfig {
  const apiKey = env.LIFEOS_API_KEY?.trim();
  const baseUrl = (env.LIFEOS_API_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  if (!apiKey) {
    throw new Error(
      "LIFEOS_API_KEY is not set. Create a key in LifeOS (Settings → MCP) and add it to your MCP client config as the LIFEOS_API_KEY environment variable.",
    );
  }
  if (!apiKey.startsWith("lif_")) {
    throw new Error(
      'LIFEOS_API_KEY does not look like a LifeOS key (expected a "lif_" prefix).',
    );
  }

  return { apiKey, baseUrl };
}

/**
 * Validate the API key against the live API. Returns the authenticated client
 * on success; throws a descriptive Error on failure so the server can refuse
 * to start.
 */
export async function authenticate(config: ResolvedConfig): Promise<LifeOSClient> {
  const client = new LifeOSClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  try {
    await client.user.getSettings();
  } catch (err) {
    if (err instanceof LifeOSApiError) {
      if (err.status === 401) {
        throw new Error(
          "LifeOS API key rejected (401). The key may be revoked or invalid. Generate a new one in LifeOS → Settings → MCP.",
        );
      }
      throw new Error(
        `LifeOS API validation failed (${err.status} ${err.code}): ${err.message}`,
      );
    }
    throw new Error(
      `Could not reach the LifeOS API at ${config.baseUrl}. Check LIFEOS_API_URL and your network. Cause: ${
        (err as Error).message
      }`,
    );
  }

  return client;
}
