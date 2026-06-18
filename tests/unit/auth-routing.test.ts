import { describe, expect, it } from "vitest";

import {
  AUTH_PAGE_PATHS,
  DEFAULT_POST_LOGIN_PATH,
  getLoginRedirectPath,
  getPostLoginRedirectPath,
  isActiveNavigationPath,
  isAuthPath,
  isProtectedAppPath,
} from "@/lib/auth/auth-routing";

describe("auth routing", () => {
  it("treats the dashboard shell and settings as protected routes", () => {
    expect(isProtectedAppPath("/dashboard")).toBe(true);
    expect(isProtectedAppPath("/areas/work")).toBe(true);
    expect(isProtectedAppPath("/settings")).toBe(true);
    expect(isProtectedAppPath("/login")).toBe(false);
  });

  it("protects dashboard routes by default (deny-by-default)", () => {
    for (const path of [
      "/contacts",
      "/notes",
      "/notes/abc",
      "/resources",
      "/topics",
      "/inbox",
      "/knowledge",
      "/my-day",
    ]) {
      expect(isProtectedAppPath(path)).toBe(true);
    }
  });

  it("leaves the landing page and auth routes public", () => {
    expect(isProtectedAppPath("/")).toBe(false);
    expect(isProtectedAppPath("/signup")).toBe(false);
    expect(isProtectedAppPath("/forgot-password")).toBe(false);
  });

  it("treats reset-password as an auth route", () => {
    expect(AUTH_PAGE_PATHS).toContain("/reset-password");
    expect(isAuthPath("/reset-password")).toBe(true);
    expect(isAuthPath("/reset-password/token")).toBe(true);
  });

  it("builds login redirects that preserve the requested protected path", () => {
    expect(getLoginRedirectPath("/projects/123")).toBe("/login?next=%2Fprojects%2F123");
    expect(getLoginRedirectPath(DEFAULT_POST_LOGIN_PATH)).toBe("/login");
  });

  it("only accepts safe relative post-login redirect targets", () => {
    expect(getPostLoginRedirectPath("/tasks")).toBe("/tasks");
    expect(getPostLoginRedirectPath("https://example.com/evil")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(getPostLoginRedirectPath("javascript:alert(1)")).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
    expect(getPostLoginRedirectPath(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("keeps parent navigation active for nested dashboard routes", () => {
    expect(isActiveNavigationPath("/areas/work", "/areas")).toBe(true);
    expect(isActiveNavigationPath("/projects/123", "/projects")).toBe(true);
    expect(isActiveNavigationPath("/projects", "/tasks")).toBe(false);
  });
});
