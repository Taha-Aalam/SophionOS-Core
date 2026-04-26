const AUTH_PAGE_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

const PROTECTED_APP_PATHS = [
  "/dashboard",
  "/areas",
  "/goals",
  "/projects",
  "/tasks",
  "/settings",
] as const;

const DEFAULT_POST_LOGIN_PATH = "/dashboard";

function matchesRoutePrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
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
  return matchesRoutePrefix(pathname, PROTECTED_APP_PATHS);
}

function isActiveNavigationPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export {
  AUTH_PAGE_PATHS,
  DEFAULT_POST_LOGIN_PATH,
  PROTECTED_APP_PATHS,
  getLoginRedirectPath,
  getPostLoginRedirectPath,
  isActiveNavigationPath,
  isAuthPath,
  isProtectedAppPath,
  shouldRedirectAuthenticatedUser,
};
