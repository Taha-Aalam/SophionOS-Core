const VALID_RETURN_ORIGINS = [
  "/areas",
  "/contacts",
  "/dashboard",
  "/goals",
  "/inbox",
  "/knowledge",
  "/my-day",
  "/notes",
  "/projects",
  "/tasks",
  "/topics",
  "/resources",
] as const;

const INVALID_RETURN_ORIGINS: Set<string> = new Set(["new", "edit", "create"]);

const VALID_RETURN_ORIGIN_PATTERN = VALID_RETURN_ORIGINS.map((origin) => origin.slice(1)).join("|");
const RETURN_TO_PATTERN = new RegExp(`^/(?:${VALID_RETURN_ORIGIN_PATTERN})(?:/|$)`);

export function isValidReturnTo(path: string | null): boolean {
  if (!path) return false;
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  if (!RETURN_TO_PATTERN.test(normalizedPath)) return false;
  const segments = normalizedPath.split("/");
  const lastSegment = segments[segments.length - 1];
  return !INVALID_RETURN_ORIGINS.has(lastSegment);
}

export function buildReturnTo(origin: string): string {
  return origin;
}

export function getReturnToParam(returnTo: string | null): string | null {
  if (!returnTo) return null;
  if (isValidReturnTo(returnTo)) {
    return returnTo;
  }
  return null;
}

export function getReturnToFallback(fallback: string): string {
  return fallback;
}

export function encodeReturnTo(path: string): string {
  return encodeURIComponent(path);
}

export function decodeReturnTo(encoded: string): string {
  try {
    const decoded = decodeURIComponent(encoded);
    if (isValidReturnTo(decoded)) {
      return decoded;
    }
    return "";
  } catch {
    return "";
  }
}

export function buildNoteNewUrl(options: {
  areaId?: string;
  goalId?: string;
  returnTo: string;
}): string {
  const params = new URLSearchParams();
  if (options.areaId) {
    params.set("areaId", options.areaId);
  }
  if (options.goalId) {
    params.set("goalId", options.goalId);
  }
  params.set("returnTo", encodeReturnTo(options.returnTo));
  return `/notes/new?${params.toString()}`;
}

export function buildNoteDetailUrl(noteIdentifier: string, returnTo: string | null): string {
  if (!returnTo) {
    return `/notes/${noteIdentifier}`;
  }
  return `/notes/${noteIdentifier}?returnTo=${encodeReturnTo(returnTo)}`;
}

export function getReturnToFromSearchParams(searchParams: URLSearchParams): string | null {
  const encoded = searchParams.get("returnTo");
  if (!encoded) return null;
  return decodeReturnTo(encoded);
}

export function resolveBackNavigation(
  returnTo: string | null,
  fallback: string,
): string {
  if (returnTo && isValidReturnTo(returnTo)) {
    return returnTo;
  }
  return fallback;
}

export function getEffectiveReturnTo(
  incomingReturnTo: string | null,
  currentPagePath: string,
): string {
  if (incomingReturnTo && isValidReturnTo(incomingReturnTo)) {
    const normalizedIncoming = incomingReturnTo.endsWith("/")
      ? incomingReturnTo.slice(0, -1)
      : incomingReturnTo;
    if (normalizedIncoming.startsWith("/areas")) {
      return incomingReturnTo;
    }
  }
  return buildReturnTo(currentPagePath);
}

export function resolveGoalDetailNavigation(
  searchParams: URLSearchParams,
  currentPagePath: string,
): {
  breadcrumbTarget: string;
  nestedReturnTo: string;
} {
  const decodedReturnTo = getReturnToFromSearchParams(searchParams);

  return {
    breadcrumbTarget: resolveBackNavigation(decodedReturnTo, "/goals"),
    nestedReturnTo: getEffectiveReturnTo(decodedReturnTo, currentPagePath),
  };
}

// Chain-preserving return-to navigation.
// `returnTo` = immediate predecessor (single path).
// `chain` = outer origins, encoded as a JSON array of paths.
// Helper view on any page: [returnTo, ...decode(chain)].

export function decodeReturnToChain(encoded: string | null | undefined): string[] {
  if (!encoded) return [];
  try {
    const json = decodeURIComponent(encoded);
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

export function encodeReturnToChain(chain: string[]): string {
  return encodeURIComponent(JSON.stringify(chain));
}

export function getReturnToChainFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  return decodeReturnToChain(searchParams.get("chain") ?? null);
}

// Computes the new `chain` value for a child link from the current page's
// URL state. The new chain = [currentReturnTo, ...currentChain]. The current
// page's own path is NOT included — it is stamped on the child via
// `buildReturnTo(currentPagePath)`.
export function buildReturnToChain(
  searchParams: URLSearchParams,
): string {
  const incomingReturnTo = getReturnToFromSearchParams(searchParams);
  const incomingChain = getReturnToChainFromSearchParams(searchParams);
  if (!incomingReturnTo) {
    return encodeReturnToChain([]);
  }
  return encodeReturnToChain([incomingReturnTo, ...incomingChain]);
}

// Pop the head of the helper view: given the current page's URL state,
// return the new (returnTo, chain) values for the destination page after
// a back navigation.
export function popReturnToChain(searchParams: URLSearchParams): {
  returnTo: string | null;
  chain: string[];
} {
  const head = getReturnToFromSearchParams(searchParams);
  const rest = getReturnToChainFromSearchParams(searchParams);
  if (!head) {
    return { returnTo: null, chain: [] };
  }
  return {
    returnTo: rest[0] ?? null,
    chain: rest.slice(1),
  };
}

// Returns the raw (decoded) chain array for use with `URLSearchParams.set()`.
// Use this when you need the chain to be set via `params.set("chain", ...)` +
// `params.toString()`, which will percent-encode the value once.
export function getRawReturnToChain(searchParams: URLSearchParams): string[] {
  return decodeReturnToChain(searchParams.get("chain") ?? null);
}

// Compute the Back-button href from the current page's URL state.
//
// Three cases:
// 1. No incoming returnTo and no chain -> fresh visit, send user to the fallback
//    (e.g. "/goals") with no params, matching the legacy resolveBackNavigation
//    behavior.
// 2. Incoming returnTo with empty chain -> back goes to the immediate
//    predecessor; that destination is the "last" page, so no chain param is
//    appended (keeps the URL clean).
// 3. Incoming returnTo with non-empty chain -> the destination is the current
//    page's `returnTo` (the immediate predecessor). The new returnTo param on
//    the destination is `chain[0]`, and the new chain param is `chain.slice(1)`.
//    The destination page then renders its own Back button using this state.
//
// Values are written via `params.set()` (NOT pre-encoded) so that
// `URLSearchParams.toString()` produces a single layer of percent-encoding.
// Mixing pre-encoded values with `set()` causes double-encoding
// (`%252F` instead of `%2F`).
export function popReturnToHref(
  searchParams: URLSearchParams,
  fallback: string,
): string {
  const currentReturnTo = getReturnToFromSearchParams(searchParams);
  const currentChain = getRawReturnToChain(searchParams);
  if (!currentReturnTo) {
    return fallback;
  }

  // Helper view: [currentReturnTo, ...currentChain].
  // Back destination: currentReturnTo, with the new state being
  // (returnTo=currentChain[0], chain=currentChain.slice(1)).
  const newReturnTo = currentChain[0] ?? null;
  const newChain = currentChain.slice(1);

  if (!newReturnTo) {
    // currentReturnTo is the end of the chain — destination gets no chain
    // params (clean URL on the last step).
    return currentReturnTo;
  }

  const params = new URLSearchParams();
  params.set("returnTo", newReturnTo);
  if (newChain.length > 0) {
    params.set("chain", JSON.stringify(newChain));
  }
  return `${currentReturnTo}?${params.toString()}`;
}

// Append `returnTo` and `chain` to an existing URLSearchParams, using the
// raw (decoded) values so that `toString()` produces a single layer of
// percent-encoding. Use this instead of manually interpolating
// `encodeReturnTo(...)` / `encodeReturnToChain(...)` into a query string when
// the value will be passed through `URLSearchParams`.
export function setReturnToParams(
  params: URLSearchParams,
  returnTo: string,
  chain: string[] = [],
): void {
  params.set("returnTo", returnTo);
  if (chain.length > 0) {
    params.set("chain", JSON.stringify(chain));
  }
}
