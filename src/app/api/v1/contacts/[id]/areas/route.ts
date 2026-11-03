import { NextRequest } from "next/server";
import { z } from "zod";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError, ValidationError } from "@/lib/api/error-handler";
import { withApiLogging } from "@/lib/api/api-log";

const linkAreaSchema = z.object({ area_id: z.string().uuid() }).strict();

async function handleGet(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const links = await contactService.getAreaLinks(userId, id, { supabase });
    return success({ contact_id: id, area_ids: links.map((l) => l.area_id) });
  } catch (err) {
    return error(err);
  }
}

async function handlePost(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    if (!request.headers.get("content-type")?.includes("application/json"))
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    const { id } = await params;
    const { area_id } = await validateBody(request, linkAreaSchema);
    const supabase = await createDataClient(authResult);
    await contactService.linkToArea(userId, id, area_id, { supabase });
    const links = await contactService.getAreaLinks(userId, id, { supabase });
    return created({ contact_id: id, area_ids: links.map((l) => l.area_id) });
  } catch (err) {
    return error(err);
  }
}

async function handleDelete(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));
    const { id } = await params;
    const areaId = new URL(request.url).searchParams.get("area_id");
    if (!areaId) throw new ValidationError("area_id is required");
    const supabase = await createDataClient(authResult);
    await contactService.unlinkFromArea(userId, id, areaId, { supabase });
    const links = await contactService.getAreaLinks(userId, id, { supabase });
    return success({ contact_id: id, area_ids: links.map((l) => l.area_id) });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/contacts/:id/areas", handleGet);
export const POST = withApiLogging("/api/v1/contacts/:id/areas", handlePost);
export const DELETE = withApiLogging("/api/v1/contacts/:id/areas", handleDelete);
