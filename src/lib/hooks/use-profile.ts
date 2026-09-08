import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useUser } from "@clerk/nextjs";

import { useAuth } from "@/components/providers/auth-provider";
import {
  userSettingsService,
  type ProfileContactSettings,
} from "@/lib/services/user-settings.service";

export const PROFILE_CONTACT_QUERY_KEY = "profile-contact";

/**
 * Clerk errors arrive as ClerkError objects with an `errors` array of
 * ClerkAPIError ({ code, message, longMessage, meta.paramName }). Surface the
 * friendliest single message; fall back to the generic rejection message.
 */
export function clerkErrorMessage(error: unknown): string {
  const e = error as
    | {
        errors?: Array<{ message?: string; longMessage?: string | null }>;
        message?: string;
      }
    | undefined;
  const first = e?.errors?.[0];
  if (first) {
    return first.longMessage || first.message || "Something went wrong. Please try again.";
  }
  return e?.message || "Something went wrong. Please try again.";
}

/**
 * Client-side identity mutations against the Clerk UserResource. The react
 * store updates reactively after `user.reload()`, so the topbar (AuthProvider
 * -> useUser()) refreshes without any query-key work here.
 *
 * The phone number is NOT a Clerk identifier (SMS sign-in needs a Pro Clerk
 * plan); it is a plain contact field stored in Supabase `user_settings` under
 * the `profile_contact` key.
 */
export function useProfileContact() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [PROFILE_CONTACT_QUERY_KEY, user?.id ?? null],
    queryFn: () => userSettingsService.getProfileContact(user!.id),
    enabled: !!user,
  });
}

export function useUpdateProfileContact() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (contact: ProfileContactSettings) =>
      userSettingsService.setProfileContact(user!.id, contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_CONTACT_QUERY_KEY] });
      toast.success("Phone number saved");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to save phone number"),
  });
}

export function useUpdateUsername() {
  const { user } = useUser();

  return useMutation({
    mutationFn: async (username: string) => {
      if (!user) throw new Error("You are signed out.");
      await user.update({ username });
      await user.reload();
    },
  });
}

export function useUploadAvatar() {
  const { user } = useUser();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("You are signed out.");
      await user.setProfileImage({ file });
      await user.reload();
    },
    onSuccess: () => toast.success("Profile photo updated"),
    onError: (error: Error) =>
      toast.error(clerkErrorMessage(error) || "Failed to update photo"),
  });
}
