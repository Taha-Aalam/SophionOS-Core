import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError, ValidationError } from "@/lib/api/error-handler";

const linkAreaSchema = z.object({ area_id: z.string().uuid() }).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    const { id } = await params;
    const supabase = await createClient();
    const links = await contactService.getAreaLinks(userId, id, { supabase });
    return success({ contact_id: id, area_ids: links.map((l) => l.area_id) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    if (!request.headers.get("content-type")?.includes("application/json"))
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    const { id } = await params;
    const { area_id } = await validateBody(request, linkAreaSchema);
    const supabase = await createClient();
    await contactService.linkToArea(userId, id, area_id, { supabase });
    const links = await contactService.getAreaLinks(userId, id, { supabase });
    return created({ contact_id: id, area_ids: links.map((l) => l.area_id) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    const { id } = await params;
    const areaId = new URL(request.url).searchParams.get("area_id");
    if (!areaId) throw new ValidationError("area_id is required");
    const supabase = await createClient();
    await contactService.unlinkFromArea(userId, id, areaId, { supabase });
    const links = await contactService.getAreaLinks(userId, id, { supabase });
    return success({ contact_id: id, area_ids: links.map((l) => l.area_id) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
