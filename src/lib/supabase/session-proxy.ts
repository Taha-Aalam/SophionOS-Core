import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  getLoginRedirectPath,
  getPostLoginRedirectPath,
  isProtectedAppPath,
  shouldRedirectAuthenticatedUser,
} from "@/lib/auth/auth-routing";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  if (isProtectedAppPath(url.pathname) && !user) {
    const pathWithQuery = `${url.pathname}${url.search}`;
    return NextResponse.redirect(new URL(getLoginRedirectPath(pathWithQuery), request.url))
  }

  if (shouldRedirectAuthenticatedUser(url.pathname) && user) {
    url.pathname = getPostLoginRedirectPath(url.searchParams.get("next"))
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
