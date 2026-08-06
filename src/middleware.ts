import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isConfiguredAppHost, normalizeOrigin } from "@/lib/routing/host";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
]);

const isApexPassthrough = createRouteMatcher([
  "/",
  "/__clerk(.*)",
  "/api/v1/billing/webhook(.*)",
]);

const isSelfAuthApi = createRouteMatcher([
  "/api/v1/(.*)",
  "/api/billing/(.*)",
  "/api/cron/(.*)",
]);

function resolveAppOrigin(): string | null {
  return normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
}

export const middleware = clerkMiddleware(async (auth, request) => {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;

  if (isConfiguredAppHost(host, process.env.NEXT_PUBLIC_APP_URL)) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isSelfAuthApi(request)) {
      return NextResponse.next();
    }
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return NextResponse.next();
  }

  if (isApexPassthrough(request)) {
    return NextResponse.next();
  }

  if (isSelfAuthApi(request)) {
    const appOrigin = resolveAppOrigin();
    if (appOrigin) {
      return NextResponse.redirect(new URL(`${pathname}${search}`, appOrigin));
    }
    return NextResponse.next();
  }

  const appOrigin = resolveAppOrigin();
  if (appOrigin) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, appOrigin));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
