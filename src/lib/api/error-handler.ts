export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code?: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Message safe to expose across a trust boundary (e.g. an API route
   * response). Client (4xx) errors carry actionable, non-sensitive text;
   * server (5xx) errors are genericized so raw DB/driver internals never
   * leak. Use this — never `error.message` — when serializing to an HTTP
   * response or any untrusted sink.
   */
  get publicMessage(): string {
    return this.statusCode >= 500 ? "An unexpected error occurred" : this.message;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    const detailsMessage =
      Array.isArray(details) && details.length > 0
        ? `: ${details
            .map((d: { path?: Array<string | number>; message?: string }) =>
              `${(d.path ?? []).join('.') || 'field'}: ${d.message ?? 'invalid'}`,
            )
            .join('; ')}`
        : '';
    super(`${message}${detailsMessage}`, 400, 'VALIDATION_ERROR');
  }
}

export function formatValidationMessage(error: Error): string {
  if (error instanceof ValidationError && Array.isArray(error.details) && error.details.length > 0) {
    const issues = error.details.map((issue: { path?: string[]; message: string }) => {
      const path = issue.path?.join?.('.') || 'field';
      return `${path}: ${issue.message}`;
    });
    return issues.join('; ');
  }
  return error.message;
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'A database error occurred', public originalError?: unknown) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'UNAUTHENTICATED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Free-tier entity cap (100) was hit. The DB enforces the cap via a BEFORE
 * INSERT trigger that does `RAISE EXCEPTION 'ENTITY_LIMIT_REACHED'` (ERRCODE
 * P0001); `mapDatabaseError` below converts that pg error into this class so
 * the API returns a 403 with an actionable publicMessage instead of a raw 500.
 */
export class EntityLimitError extends AppError {
  constructor(
    message: string = "You've hit the 100-item Free limit — upgrade to Pro for unlimited items.",
  ) {
    super(message, 403, 'ENTITY_LIMIT_REACHED');
  }
}

/**
 * Translate a supabase-js / pg insert error into a typed AppError. Detects the
 * entity-cap trigger's `ENTITY_LIMIT_REACHED` raise (matched on the message,
 * since PostgREST surfaces the RAISEd text) and maps it to EntityLimitError;
 * any other error becomes a generic DatabaseError. Service create() paths call
 * this so the cap surfaces as a friendly 403, not a 500.
 */
export function mapDatabaseError(error: { message?: string; code?: string } | null | undefined): AppError {
  const message = error?.message ?? '';
  if (message.includes('ENTITY_LIMIT_REACHED')) {
    return new EntityLimitError();
  }
  return new DatabaseError(message || undefined);
}
