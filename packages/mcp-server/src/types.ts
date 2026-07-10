/**
 * Shared types for the SophionOS MCP server.
 */

/** Standard success envelope: `{ data }`. */
export interface SuccessEnvelope<T = unknown> {
  data: T;
}

/** Paginated envelope: `{ data, pagination }`. */
export interface PaginatedEnvelope<T = unknown> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/** Error envelope: `{ error: { code, message } }`. */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

/** Raised when the SophionOS API returns a non-2xx response. */
export class SophionOSApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "SophionOSApiError";
    this.status = status;
    this.code = code;
  }
}

export interface ListParams {
  page?: number;
  pageSize?: number;
}
