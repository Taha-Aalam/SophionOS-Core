import { createClerkClient } from "@clerk/nextjs/server";

export async function resolveUserEmail(userId: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set");
  const clerk = createClerkClient({ secretKey });
  const user = await clerk.users.getUser(userId);
  const primaryId = user.primaryEmailAddressId;
  const primary = user.emailAddresses.find((e) => e.id === primaryId);
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}
