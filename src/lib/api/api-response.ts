import { NextResponse } from "next/server";
import { AppError } from "./error-handler";
import { logApiFailure } from "./api-log";
import { releaseHeader, withReleaseMeta } from "@/lib/watermark/envelope";

/**
 * Standard success envelope: `{ data }`. Defaults to 200.
 */
export function success<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(withReleaseMeta({ data }), { status });
}

/**
 * 201 Created envelope for write routes.
 */
export function created<T>(data: T): NextResponse {
  return NextResponse.json(withReleaseMeta({ data }), { status: 201 });
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
  return NextResponse.json(
    withReleaseMeta({
      data,
      pagination: { total, page, pageSize, totalPages },
    }),
  );
}

/**
 * Error envelope: `{ error: { code, message } }`. Uses `publicMessage` so 5xx
 * internals never leak across the trust boundary. Rate-limit (429) responses
 * carry a `Retry-After` header.
 *
 * This is the single point where an error becomes an HTTP response, so it is
 * also where every 5xx is logged with its real cause (`DatabaseError`'s
 * `originalError`, a non-`AppError`'s message + stack). The body and status
 * sent to the client are unchanged; only the log receives internal detail.
 * 4xx responses need no error line — the request line covers them.
 */
export function error(err: unknown): NextResponse {
  if (!(err instanceof AppError)) {
    // Route-level catch handed us a raw throw. Log its message + stack, then
    // answer exactly as the previous `new AppError("Internal server error")`
    // path did.
    logApiFailure({ err, status: 500 });
    return errorResponse(new AppError("Internal server error"));
  }

  if (err.statusCode >= 500) {
    logApiFailure({ err, status: err.statusCode });
  }

  return errorResponse(err);
}

function errorResponse(err: AppError): NextResponse {
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
  headers["X-Sophonios-Release"] = releaseHeader();
  return NextResponse.json(body, { status: err.statusCode, headers });
}
