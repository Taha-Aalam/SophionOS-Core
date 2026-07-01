import { NextResponse } from "next/server";
import { AppError } from "./error-handler";

/**
 * Standard success envelope: `{ data }`. Defaults to 200.
 */
export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * 201 Created envelope for write routes.
 */
export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

/**
 * Paginated list envelope. `totalPages` is derived from `total`/`pageSize`
 * (min 1 so an empty list still reports a single page, never 0).
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): NextResponse {
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  return NextResponse.json({
    data,
    pagination: { total, page, pageSize, totalPages },
  });
}

/**
 * Error envelope: `{ error: { code, message } }`. Uses `publicMessage` so 5xx
 * internals never leak across the trust boundary. Rate-limit (429) responses
 * carry a `Retry-After` header.
 */
export function error(err: AppError): NextResponse {
  const body = {
    error: {
      code: err.code ?? "ERROR",
      message: err.publicMessage,
    },
  };
  const headers: Record<string, string> = {};
  if (err.statusCode === 429) {
    headers["Retry-After"] = "60";
  }
  return NextResponse.json(body, { status: err.statusCode, headers });
}
