import type { NextRequest } from "next/server";
import type { ZodType } from "zod/v4";
import { ValidationError } from "./error-handler";

function formatIssues(error: unknown): Array<{ path: Array<string | number>; message: string }> {
  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path?: Array<string | number>; message?: string }> }).issues.map(
      (issue) => ({
        path: issue.path ?? [],
        message: issue.message ?? "invalid",
      }),
    );
  }
  return [];
}

/**
 * Parses and validates a JSON request body against a Zod schema. Throws
 * ValidationError (400) on malformed JSON or schema failure.
 */
export async function validateBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON body");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError("Validation failed", formatIssues(result.error));
  }
  return result.data;
}

/**
 * Validates search params against a Zod schema. The schema receives a plain
 * object of string values (last value wins for repeated keys).
 */
export function validateQuery<T>(request: NextRequest, schema: ZodType<T>): T {
  const { searchParams } = new URL(request.url);
  const obj: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    obj[key] = value;
  }

  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ValidationError("Invalid query parameters", formatIssues(result.error));
  }
  return result.data;
}

/**
 * Validates route params (e.g. `{ id }`) against a Zod schema.
 */
export function validateParams<T>(params: Record<string, string>, schema: ZodType<T>): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ValidationError("Invalid route parameters", formatIssues(result.error));
  }
  return result.data;
}
