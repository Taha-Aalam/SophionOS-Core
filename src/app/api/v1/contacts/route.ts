import { NextRequest } from "next/server";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, paginated, created, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { createContactSchema } from "@/lib/validators/contact.schema";

function parseBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const supabase = await createDataClient(authResult);

    // follow_up=true returns only contacts whose follow-up window has lapsed.
    if (searchParams.get("follow_up") === "true") {
      const needFollowUp = await contactService.getNeedFollowUp(userId, { supabase });
      return paginated(needFollowUp, needFollowUp.length, page, pageSize);
    }

    const group = searchParams.get("group") ?? undefined;
    const archive = parseBool(searchParams.get("archive"));

    let data = await contactService.list(
      userId,
      {
        ...(group ? { group } : {}),
        ...(archive !== undefined ? { archive } : {}),
      },
      { supabase },
    );

    // contactService.list has no `favorite` predicate; post-filter when asked.
    const favorite = parseBool(searchParams.get("favorite"));
    if (favorite !== undefined) {
      data = data.filter((contact) => Boolean(contact.favorite) === favorite);
    }

    return paginated(data, data.length, page, pageSize);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createContactSchema);
    const supabase = await createDataClient(authResult);
    const contact = await contactService.create(
      userId,
      body as Parameters<typeof contactService.create>[1],
      { supabase },
    );
    return created(contact);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
