const VALID_RETURN_ORIGINS = [
  "/areas",
  "/contacts",
  "/dashboard",
  "/goals",
  "/knowledge",
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

const CHAIN_DELIM = "|";

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
