"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";

import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { provisionSubscription, seedDefaultAreas } from "@/lib/services/onboarding.service";

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const { isLoaded, userId } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seededUserIdsRef = useRef(new Set<string>());
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  // Until Clerk's client SDK loads, ALL its hooks (useUser AND useAuth().userId)
  // report null. Trust the server-resolved id — passed from the (dashboard)
  // layout's `auth()` — so query keys (`user.id`) and `enabled: !!user` gating
  // are correct on the FIRST client paint and data fetches start immediately,
  // instead of stalling until hydration flips user null -> real (the "empty
  // dashboard then reload" flash). Once loaded, switch to the live client id so
  // sign-out's session revoke is reflected. The id is identical across the
  // switch, so the query key never changes — no refetch flash.
  const effectiveUserId = isLoaded ? userId : initialUser?.id ?? null;

  const resolvedUser: AuthUser | null = useMemo(
    () =>
      effectiveUserId
        ? {
            id: effectiveUserId,
            email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
            name:
              clerkUser?.fullName ||
              clerkUser?.firstName ||
              clerkUser?.username ||
              null,
            imageUrl: clerkUser?.imageUrl || null,
          }
        : null,
    [effectiveUserId, clerkUser],
  );

  // During sign-out, freeze the last known user so dashboard hooks don't drop
  // their data (enabled:!!user -> false) while the tree is still mounted mid
  // client-side navigation to /login. Captured in state (not a ref) at signout
  // time so render never reads a ref — see react-hooks/refs.
  const [frozenUser, setFrozenUser] = React.useState<AuthUser | null>(null);
  const user = isSigningOut ? frozenUser : resolvedUser;

  useEffect(() => {
    if (!user) return;
    if (seededUserIdsRef.current.has(user.id)) return;
    seededUserIdsRef.current.add(user.id);

    void (async () => {
      try {
        await seedDefaultAreas(user.id);
        await provisionSubscription();
        // Idempotent bootstrap only. Do NOT auto-complete onboarding here —
        // the /onboarding route/page owns that state (see onboarding-routing).
        // Surgical invalidation: only the "list" entry for this user. Avoids
        // clobbering other keys (and the in-flight client fetches on login)
        // that `invalidateQueries({ queryKey: [AREAS_QUERY_KEY] })` would
        // wipe via prefix match.
        await queryClient.invalidateQueries({
          queryKey: [AREAS_QUERY_KEY, "list", user.id],
        });
      } catch (error) {
        seededUserIdsRef.current.delete(user.id);
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to seed default areas", error);
        }
      }
    })();
  }, [user, queryClient]);

  async function signOut() {
    // Freeze the last known user so dashboard hooks don't drop their data
    // (enabled:!!user -> false) while the tree is still mounted during the
    // sign-out redirect. Captured in state (not a ref) at sign-out time so
    // render never reads a ref.
    setFrozenUser(resolvedUser);
    setIsSigningOut(true);
    try {
      // Clear the Clerk session and cookies first, then navigate manually.
      // Using redirectUrl here can cause a premature client-side redirect
      // before cookies are cleared, leaving stale session state that
      // produces a blank branded screen on next visit.
      await clerkSignOut();
      router.replace("/login");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth-provider] signOut failed", err);
      }
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading: !isLoaded, isSigningOut, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
