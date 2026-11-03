import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { logEvent } from "@/lib/logging/logger";
import { AppError } from "./error-handler";

/**
 * API observability: one request line per API request, one error line per
 * handled 5xx, both carrying an end-to-end `request_id`.
 *
 * Integration points (docs/prompts/fix-api-requests):
 *   1. `withApiLogging(route, handler)` — the single wrapper every
 *      `src/app/api/**\/route.ts` handler is exported through. It owns the
 *      request line (status + duration), sets the `x-request-id` response
 *      header, and provides the async-local context below.
 *   2. `error()` in `api-response.ts` — the shared point where an error
 *      becomes a response. It emits the 5xx error line while the wrapper's
 *      context is still active and leaves the client body untouched.
 *
 * Nothing here logs request/response bodies, query strings, authorization
 * headers, tokens, ciphertext or PII. Envelope facts only.
 */

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Accept only conservative request-id tokens (no newlines, quotes or braces),
 * so an inbound header cannot forge extra log lines. Longer/odd values are
 * replaced with a generated id instead of being logged.
 */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type ApiMethod = string;

export interface ApiLogContext {
  requestId: string;
  method: ApiMethod;
  /** Route template, e.g. `/api/v1/projects/:id` — never a raw path. */
  route: string;
  startedAt: number;
  /** Authenticated Clerk user id (never email or name). */
  userId?: string;
  /** Set once a 5xx line has been emitted for this request. */
  errorLogged?: boolean;
}

const apiLogStorage = new AsyncLocalStorage<ApiLogContext>();

/** Request context for the in-flight API request, if any. */
export function getApiLogContext(): ApiLogContext | undefined {
  return apiLogStorage.getStore();
}

/**
 * Record the authenticated caller. Called once, from `requireAuth`, so every
 * route (Clerk session or API key) attributes its lines without extra wiring.
 */
export function setApiLogUserId(userId: string | undefined): void {
  const ctx = apiLogStorage.getStore();
  if (ctx && userId) ctx.userId = userId;
}

/** Honor an incoming `x-request-id`; otherwise mint one. */
export function resolveRequestId(request: NextRequest): string {
  const incoming = request.headers.get(REQUEST_ID_HEADER)?.trim();
  if (incoming && REQUEST_ID_PATTERN.test(incoming)) return incoming;
  return randomUUID();
}

interface CauseFields {
  cause_code?: string;
  cause_message?: string;
}

/** Pull code/message off a wrapped driver error (e.g. a PostgREST error). */
function describeCause(cause: unknown): CauseFields {
  if (cause == null) return {};
  if (typeof cause === "string") return { cause_message: cause };
  if (typeof cause !== "object") return { cause_message: String(cause) };

  const record = cause as { code?: unknown; message?: unknown };
  const fields: CauseFields = {};
  if (typeof record.code === "string" && record.code.length > 0) {
    fields.cause_code = record.code;
  }
  if (typeof record.message === "string" && record.message.length > 0) {
    fields.cause_message = record.message;
  }
  return fields;
}

export interface ApiErrorLogInput {
  /** The thrown value, when the caller still has it. */
  err?: unknown;
  status: number;
  /** Overrides the error class code (e.g. a route-specific response code). */
  code?: string;
}

/**
 * Emit the error-level line for a 5xx. Carries the request id, route, status,
 * the error code and internal message, and the wrapped cause (a DatabaseError's
 * `originalError`, e.g. the Postgres error). Non-`AppError` throws also carry
 * their stack. `publicMessage` is never used here: the body sent to the client
 * is unchanged, only the log gets the internal detail.
 */
export function logApiFailure({ err, status, code }: ApiErrorLogInput): void {
  const ctx = getApiLogContext();
  if (ctx) ctx.errorLogged = true;

  const appError = err instanceof AppError ? err : undefined;
  // `originalError` is carried by DatabaseError (and any future wrapper); other
  // AppErrors have no wrapped cause, so a raw throw is its own cause.
  const wrappedCause = appError
    ? (appError as AppError & { originalError?: unknown }).originalError
    : err;
  const cause = describeCause(wrappedCause);

  const errorMessage =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : err === undefined
          ? undefined
          : String(err);

  const stack = err instanceof Error && !appError ? err.stack : undefined;

  logEvent("error", "api_error", {
    request_id: ctx?.requestId,
    method: ctx?.method,
    route: ctx?.route,
    status,
    error_code: code ?? appError?.code ?? (err === undefined ? "SERVER_ERROR" : undefined),
    error_message: errorMessage,
    user_id: ctx?.userId,
    ...cause,
    stack,
  });
}

type RouteContext = Record<string, unknown>;

function withRequestIdHeader(response: Response, requestId: string): Response {
  try {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  } catch {
    // Immutable header guard (or a frozen response): copy instead of failing
    // the request over observability.
    const headers = new Headers(response.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

/**
 * Wrap an API route handler so it emits one `api_request` line, sets the
 * `x-request-id` header, and provides the async-local context used by the
 * shared error path. `route` is the template for this handler (e.g.
 * `/api/v1/projects/:id`), so logs never carry raw path-parameter values.
 */
export function withApiLogging<C extends RouteContext | undefined = RouteContext>(
  route: string,
  handler: (request: NextRequest, context: C) => Promise<Response> | Response,
): (request: NextRequest, context?: C) => Promise<Response> {
  return async function loggedHandler(
    request: NextRequest,
    context?: C,
  ): Promise<Response> {
    const requestId = resolveRequestId(request);
    const ctx: ApiLogContext = {
      requestId,
      method: request.method,
      route,
      startedAt: performance.now(),
    };

    return apiLogStorage.run(ctx, async () => {
      let response: Response;
      try {
        response = await handler(request, context as C);
      } catch (err) {
        // Nothing handled it inside the route: record the real cause + stack
        // before letting Next produce its own 500.
        logApiFailure({ err, status: 500 });
        throw err;
      }

      // Routes that build a 5xx themselves (billing webhook, cron) still get
      // an error line even if they did not route through `error()`.
      if (response.status >= 500 && !ctx.errorLogged) {
        logApiFailure({ status: response.status });
      }

      logEvent("info", "api_request", {
        request_id: ctx.requestId,
        method: ctx.method,
        route: ctx.route,
        status: response.status,
        duration_ms: Math.round(performance.now() - ctx.startedAt),
        user_id: ctx.userId,
      });

      return withRequestIdHeader(response, requestId);
    });
  };
}
