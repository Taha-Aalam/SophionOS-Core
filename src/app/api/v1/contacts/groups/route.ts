import { NextRequest } from "next/server";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { paginated, error } from "@/lib/api/api-response";
import { getPaginationParams } from "@/lib/api/pagination";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const supabase = await createClient();

    // getByGroup returns a Record<groupName, Contact[]>; reshape into an array
    // of { group, contacts } so the paginated envelope carries a list.
    const grouped = await contactService.getByGroup(userId, { supabase });
    const groups = Object.entries(grouped).map(([group, contacts]) => ({ group, contacts }));
    return paginated(groups, groups.length, page, pageSize);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
