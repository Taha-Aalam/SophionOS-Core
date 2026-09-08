import { createClerkClient } from "@clerk/nextjs/server";

export interface ResolvedUserProfile {
  email: string | null;
  name: string | null;
  imageUrl: string | null;
}

/**
 * Email + display name + avatar in ONE Clerk backend call, for server-component
 * seeding (dashboard layout → topbar first paint). Returns null on any failure
 * so callers can degrade to client-side Clerk resolution.
 */
export async function resolveUserProfile(userId: string): Promise<ResolvedUserProfile | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(userId);
  const primaryId = user.primaryEmailAddressId;
  const primary = user.emailAddresses.find((e) => e.id === primaryId);
  return {
    email: primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
    name: user.fullName || user.firstName || user.username || null,
    imageUrl: user.imageUrl || null,
  };
}

export async function resolveUserEmail(userId: string): Promise<string | null> {
  const profile = await resolveUserProfile(userId);
  return profile?.email ?? null;
}
