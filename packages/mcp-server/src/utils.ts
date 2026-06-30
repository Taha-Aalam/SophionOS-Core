/**
 * Shared helpers for MCP tool handlers.
 */

import type { LifeOSApiError } from "./types.js";

export interface ToolTextResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/** Wrap a JSON-serializable value as a text tool result. */
export function jsonResult(value: unknown): ToolTextResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

/** Wrap a plain message as a text tool result. */
export function textResult(message: string): ToolTextResult {
  return { content: [{ type: "text", text: message }] };
}

/** Wrap an error as a failed tool result with a friendly message. */
export function errorResult(err: unknown): ToolTextResult {
  const apiErr = err as Partial<LifeOSApiError>;
  const message =
    apiErr && typeof apiErr.status === "number"
      ? `LifeOS API error (${apiErr.status} ${apiErr.code}): ${apiErr.message}`
      : `Unexpected error: ${(err as Error)?.message ?? String(err)}`;
  return { content: [{ type: "text", text: message }], isError: true };
}

/**
 * Run an async tool body, converting thrown errors into failed tool results
 * instead of crashing the transport.
 */
export async function runTool(
  fn: () => Promise<ToolTextResult>,
): Promise<ToolTextResult> {
  try {
    return await fn();
  } catch (err) {
    return errorResult(err);
  }
}
