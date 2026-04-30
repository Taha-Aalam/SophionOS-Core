"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { seedDefaultAreas } from "@/lib/services/onboarding.service";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const seededUserIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let isMounted = true;

    async function ensureDefaultAreas(userId: string) {
      if (seededUserIdsRef.current.has(userId)) {
        return;
      }

      seededUserIdsRef.current.add(userId);

      try {
        await seedDefaultAreas(userId);
        await queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      } catch (error) {
        seededUserIdsRef.current.delete(userId);
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to seed default areas", error);
        }
      }
    }

    async function syncSession(nextSession: Session | null) {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (nextSession?.user) {
        await ensureDefaultAreas(nextSession.user.id);
      }
    }

    async function loadSession() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        await syncSession(currentSession);
      } catch {
        if (isMounted) {
          toast.error("Authentication error");
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      void syncSession(nextSession);

      if (event === "SIGNED_OUT") {
        router.replace("/login");
        router.refresh();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient, router, supabase]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Error signing out");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
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
