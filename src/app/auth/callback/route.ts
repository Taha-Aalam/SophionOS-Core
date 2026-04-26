import { NextResponse } from "next/server";

import { getPostLoginRedirectPath } from "@/lib/auth/auth-routing";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorMessage = searchParams.get("error_description") ?? searchParams.get("error");

  if (!code) {
    const message = errorMessage ?? "Missing code";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  const destination = getPostLoginRedirectPath(searchParams.get("next"));
  return NextResponse.redirect(`${origin}${destination}`);
}
