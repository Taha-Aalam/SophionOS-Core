import { NextRequest } from "next/server";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

async function handlePost(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    // Contacts have no dedicated archive method; the `archive` boolean column
    // is toggled through the standard update path.
    const contact = await contactService.update(userId, id, { archive: true }, { supabase });
    return success(contact);
  } catch (err) {
    return error(err);
  }
}

export const POST = withApiLogging("/api/v1/contacts/:id/archive", handlePost);
