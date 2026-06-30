const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

/**
 * Extracts `page` (default 1, min 1) and `pageSize` (default 50, clamped to
 * 1..200) from search params. `offset`/`limit` are derived for use with
 * supabase `.range(offset, offset + limit - 1)`. Never returns an unbounded
 * page size.
 */
export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const rawPage = Number.parseInt(searchParams.get("page") ?? "", 10);
  const rawPageSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    limit: pageSize,
  };
}

/**
 * Builds an absolute-or-relative page link preserving the base URL's existing
 * query params, overriding only `page`/`pageSize`.
 */
export function buildPageLink(baseUrl: string, page: number, pageSize: number): string {
  const url = new URL(baseUrl, "http://internal");
  url.searchParams.set("page", String(page));
  url.searchParams.set("pageSize", String(pageSize));
  return `${url.pathname}${url.search}`;
}
