import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

const linkBodySchema = z.object({
  project_id: z.string().uuid(),
  role_in_project: z.string().max(255).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createClient();
    const links = await contactService.getProjectLinks(userId, id, { supabase });
    return success(links);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const { project_id, role_in_project } = await validateBody(request, linkBodySchema);
    const supabase = await createClient();
    await contactService.linkToProject(userId, id, project_id, role_in_project, { supabase });
    const links = await contactService.getProjectLinks(userId, id, { supabase });
    return success(links);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const { project_id } = await validateBody(request, linkBodySchema);
    const supabase = await createClient();
    await contactService.unlinkFromProject(userId, id, project_id, { supabase });
    const links = await contactService.getProjectLinks(userId, id, { supabase });
    return success(links);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
