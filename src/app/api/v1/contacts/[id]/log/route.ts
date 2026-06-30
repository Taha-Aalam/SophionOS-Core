import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

// A logged interaction may carry a message (creates a contact_logs row) or be
// a bare timestamp bump. `message` is optional so both flows share one route.
const logBodySchema = z.object({ message: z.string().min(1).max(2000).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, logBodySchema);
    const supabase = await createClient();

    if (body.message) {
      // createLog persists the message AND bumps last_interaction_at.
      const log = await contactService.createLog(
        userId,
        id,
        { message: body.message },
        { supabase },
      );
      return created(log);
    }

    // No message: just record that an interaction happened now.
    const contact = await contactService.logInteraction(userId, id, { supabase });
    return success(contact);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
