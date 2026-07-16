/**
 * Shared helpers for MCP tool handlers.
 */

import type { SophionOSApiError } from "./types.js";
import * as z from "zod/v4";

/** Align with API MAX_BULK_IDS — hard cap on destructive/bulk mutations. */
export const MAX_BULK_IDS = 100;

/** UUID bulk id list with max bound (for tools that accept ids). */
export const bulkIdsField = z
  .array(z.string().min(1))
  .min(1)
  .max(MAX_BULK_IDS)
  .describe(`One or more entity ids (max ${MAX_BULK_IDS}).`);

/**
 * Require explicit confirm:true for irreversible bulk deletes so agents cannot
 * mass-delete from prompt injection alone without an explicit user-approved arg.
 */
export function requireDestructiveConfirm(confirm: boolean | undefined): void {
  if (confirm !== true) {
    throw new Error(
      'Destructive bulk action requires confirm: true. Ask the user to confirm before deleting permanently.',
    );
  }
}

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
  const apiErr = err as Partial<SophionOSApiError>;
  const message =
    apiErr && typeof apiErr.status === "number"
      ? `SophionOS API error (${apiErr.status} ${apiErr.code}): ${apiErr.message}`
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
