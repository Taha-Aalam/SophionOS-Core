/**
 * Central route-permission map for `/api/v1` data routes.
 * Coverage is enforced by scripts/check-route-permissions.mjs + unit tests.
 */

export type RoutePermission = {
  readScope?: string | null;
  writeScope?: string | null;
  isDestructive?: boolean;
  isBulk?: boolean;
  isArchive?: boolean;
};

/** Path pattern after /api/v1 — use :id for dynamic segments. */
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Areas
  "areas": { readScope: "areas:read", writeScope: "areas:write" },
  "areas/:id": { readScope: "areas:read", writeScope: "areas:write", isDestructive: true },
  "areas/:id/archive": { writeScope: "archive:write", isArchive: true },
  "areas/:id/restore": { writeScope: "archive:write", isArchive: true },

  // Goals
  "goals": { readScope: "goals:read", writeScope: "goals:write" },
  "goals/:id": { readScope: "goals:read", writeScope: "goals:write", isDestructive: true },
  "goals/:id/archive": { writeScope: "archive:write", isArchive: true },
  "goals/:id/restore": { writeScope: "archive:write", isArchive: true },
  "goals/:id/areas": { readScope: "goals:read", writeScope: "goals:write" },

  // Projects
  "projects": { readScope: "projects:read", writeScope: "projects:write" },
  "projects/:id": { readScope: "projects:read", writeScope: "projects:write", isDestructive: true },
  "projects/:id/archive": { writeScope: "archive:write", isArchive: true },
  "projects/:id/restore": { writeScope: "archive:write", isArchive: true },
  "projects/:id/areas": { readScope: "projects:read", writeScope: "projects:write" },
  "projects/:id/goals": { readScope: "projects:read", writeScope: "projects:write" },

  // Tasks
  "tasks": { readScope: "tasks:read", writeScope: "tasks:write" },
  "tasks/:id": { readScope: "tasks:read", writeScope: "tasks:write", isDestructive: true },
  "tasks/:id/archive": { writeScope: "archive:write", isArchive: true },
  "tasks/:id/restore": { writeScope: "archive:write", isArchive: true },
  "tasks/:id/areas": { readScope: "tasks:read", writeScope: "tasks:write" },
  "tasks/:id/goals": { readScope: "tasks:read", writeScope: "tasks:write" },
  "tasks/:id/projects": { readScope: "tasks:read", writeScope: "tasks:write" },
  "tasks/bulk/archive": { writeScope: "bulk:write", isBulk: true, isArchive: true },
  "tasks/bulk/complete": { writeScope: "bulk:write", isBulk: true },
  "tasks/bulk/delete": { writeScope: "bulk:write", isBulk: true, isDestructive: true },

  // Notes
  "notes": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id": { readScope: "notes:read", writeScope: "notes:write", isDestructive: true },
  "notes/:id/archive": { writeScope: "archive:write", isArchive: true },
  "notes/:id/restore": { writeScope: "archive:write", isArchive: true },
  "notes/:id/areas": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id/goals": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id/projects": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id/topics": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id/notebooks": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id/related": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/:id/tasks": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/bulk/archive": { writeScope: "bulk:write", isBulk: true, isArchive: true },
  "notes/bulk/delete": { writeScope: "bulk:write", isBulk: true, isDestructive: true },
  "notes/bulk/update-status": { writeScope: "bulk:write", isBulk: true },
  "notes/notebooks": { readScope: "notes:read", writeScope: "notes:write" },
  "notes/types": { readScope: "notes:read", writeScope: "notes:write" },

  // Resources
  "resources": { readScope: "resources:read", writeScope: "resources:write" },
  "resources/:id": { readScope: "resources:read", writeScope: "resources:write", isDestructive: true },
  "resources/:id/archive": { writeScope: "archive:write", isArchive: true },
  "resources/:id/restore": { writeScope: "archive:write", isArchive: true },
  "resources/:id/areas": { readScope: "resources:read", writeScope: "resources:write" },
  "resources/:id/goals": { readScope: "resources:read", writeScope: "resources:write" },
  "resources/:id/projects": { readScope: "resources:read", writeScope: "resources:write" },
  "resources/:id/tasks": { readScope: "resources:read", writeScope: "resources:write" },

  // Topics
  "topics": { readScope: "topics:read", writeScope: "topics:write" },
  "topics/:id": { readScope: "topics:read", writeScope: "topics:write", isDestructive: true },
  "topics/:id/archive": { writeScope: "archive:write", isArchive: true },
  "topics/:id/restore": { writeScope: "archive:write", isArchive: true },

  // Contacts
  "contacts": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/:id": { readScope: "contacts:read", writeScope: "contacts:write", isDestructive: true },
  "contacts/:id/archive": { writeScope: "archive:write", isArchive: true },
  "contacts/:id/restore": { writeScope: "archive:write", isArchive: true },
  "contacts/:id/areas": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/:id/goals": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/:id/projects": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/:id/tasks": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/:id/log": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/:id/image": { readScope: "contacts:read", writeScope: "contacts:write" },
  "contacts/grouped-by-area": { readScope: "contacts:read" },
  "contacts/grouped-by-goal": { readScope: "contacts:read" },
  "contacts/groups": { readScope: "contacts:read" },

  // Aggregates / search
  "dashboard/activity": { readScope: "dashboard:read" },
  "dashboard/today": { readScope: "dashboard:read" },
  "inbox": { readScope: "inbox:read", writeScope: "tasks:write" },
  "my-day": { readScope: "my-day:read", writeScope: "tasks:write" },
  "knowledge/search": { readScope: "knowledge:search" },
  "search": { readScope: "knowledge:search" },
  "mcp/health": { readScope: "dashboard:read" },
};

/** Normalize /api/v1/... path to map key with :id placeholders. */
export function normalizeApiV1Path(pathname: string): string {
  let p = pathname.replace(/\/+$/, "");
  const prefix = "/api/v1/";
  if (p.startsWith(prefix)) {
    p = p.slice(prefix.length);
  } else if (p.startsWith("api/v1/")) {
    p = p.slice("api/v1/".length);
  }
  // UUID segments → :id
  return p
    .split("/")
    .map((seg) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        seg,
      )
        ? ":id"
        : seg,
    )
    .join("/");
}

export function lookupRoutePermission(
  pathname: string,
): RoutePermission | null {
  const key = normalizeApiV1Path(pathname);
  return ROUTE_PERMISSIONS[key] ?? null;
}

export function isPermanentDeletePath(
  pathname: string,
  method: string,
): boolean {
  if (method.toUpperCase() !== "DELETE") return false;
  const perm = lookupRoutePermission(pathname);
  if (perm?.isDestructive) return true;
  // bulk delete paths
  const key = normalizeApiV1Path(pathname);
  return key.endsWith("/bulk/delete") || key.includes("/bulk/delete");
}
