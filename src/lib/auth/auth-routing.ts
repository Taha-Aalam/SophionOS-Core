const AUTH_PAGE_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

// Paths reachable without a session. Everything else under the app is
// treated as protected (deny-by-default) so newly added dashboard routes
// are gated automatically instead of needing to be listed here.
const PUBLIC_APP_PATHS = ["/", ...AUTH_PAGE_PATHS] as const;

const DEFAULT_POST_LOGIN_PATH = "/dashboard";

function matchesRoutePrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return matchesRoutePrefix(
    pathname,
    PUBLIC_APP_PATHS.filter((p) => p !== "/"),
  );
}

function isSafeRedirectPath(pathname: string | null | undefined): pathname is string {
  return Boolean(pathname?.startsWith("/") && !pathname.startsWith("//"));
}

function getPostLoginRedirectPath(nextPath: string | null | undefined): string {
  return isSafeRedirectPath(nextPath) ? nextPath : DEFAULT_POST_LOGIN_PATH;
}

function getLoginRedirectPath(nextPath?: string): string {
  const safeNextPath = getPostLoginRedirectPath(nextPath);

  if (safeNextPath === DEFAULT_POST_LOGIN_PATH) {
    return "/login";
  }

  return `/login?next=${encodeURIComponent(safeNextPath)}`;
}

function isAuthPath(pathname: string): boolean {
  return matchesRoutePrefix(pathname, AUTH_PAGE_PATHS);
}

function shouldRedirectAuthenticatedUser(pathname: string): boolean {
  return isAuthPath(pathname) && !matchesRoutePrefix(pathname, ["/reset-password"]);
}

function isProtectedAppPath(pathname: string): boolean {
  return !isPublicPath(pathname);
}

function isActiveNavigationPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export {
  AUTH_PAGE_PATHS,
  DEFAULT_POST_LOGIN_PATH,
  PUBLIC_APP_PATHS,
  getLoginRedirectPath,
  getPostLoginRedirectPath,
  isActiveNavigationPath,
  isAuthPath,
  isProtectedAppPath,
  isPublicPath,
  shouldRedirectAuthenticatedUser,
};
