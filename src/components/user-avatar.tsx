"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for "the signed-in user, as rendered".
 *
 * Every surface that shows the user (topbar profile button, sidebar profile
 * button, any future one) must read the name, the image URL and the initials
 * fallback from here. Before this existed the sidebar built its own initials
 * from `user.name` and never rendered `user.imageUrl` at all, so the two
 * avatars could — and did — diverge: an "TH" initials circle in the rail next
 * to the real photo in the topbar.
 *
 * `useAuth().user` is itself the shared source: it resolves Clerk's live user
 * and falls back to the server-seeded profile from the (dashboard) layout, so
 * the first paint already has the real name/image on both surfaces.
 */
export function useUserIdentity() {
  const { user } = useAuth();

  // Title-case every word: Clerk may return lowercase usernames/emails, and a
  // raw fallback value must still read as a proper name.
  const rawName = user?.name || user?.email || "User";
  const displayName = rawName.replace(/\b([\p{L}])/gu, (ch) => ch.toUpperCase());
  const email = user?.email ?? "";
  const avatarUrl = user?.imageUrl || undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  return { user, displayName, email, avatarUrl, initials };
}

/**
 * The user's avatar: profile image when one exists, initials derived from the
 * same name data otherwise. Consumers own the surrounding chrome (the topbar's
 * gradient ring, the rail's hit target) — never the identity data.
 */
export function UserAvatar({
  className,
  fallbackClassName,
  size = "sm",
}: {
  className?: string;
  fallbackClassName?: string;
  size?: "default" | "sm" | "lg";
}) {
  const { displayName, avatarUrl, initials } = useUserIdentity();

  return (
    <Avatar size={size} className={cn(className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
      <AvatarFallback className={fallbackClassName}>{initials}</AvatarFallback>
    </Avatar>
  );
}
