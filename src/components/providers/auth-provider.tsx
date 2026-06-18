"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { seedDefaultAreas } from "@/lib/services/onboarding.service";

interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seededUserIdsRef = useRef(new Set<string>());

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        name:
          clerkUser.fullName ||
          clerkUser.firstName ||
          clerkUser.username ||
          null,
        imageUrl: clerkUser.imageUrl || null,
      }
    : null;

  useEffect(() => {
    if (!user) return;
    if (seededUserIdsRef.current.has(user.id)) return;
    seededUserIdsRef.current.add(user.id);

    void (async () => {
      try {
        await seedDefaultAreas(user.id);
        await queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      } catch (error) {
        seededUserIdsRef.current.delete(user.id);
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to seed default areas", error);
        }
      }
    })();
  }, [user, queryClient]);

  async function signOut() {
    await clerkSignOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading: !isLoaded, signOut }}>
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
