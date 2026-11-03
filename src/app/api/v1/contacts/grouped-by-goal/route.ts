import { NextRequest } from "next/server";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { paginated, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

async function handleGet(request: NextRequest) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const supabase = await createDataClient(authResult);

    const groups = await contactService.getContactsGroupedByGoal(userId, { supabase });
    return paginated(groups, groups.length, page, pageSize);
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/contacts/grouped-by-goal", handleGet);
