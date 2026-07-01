import { NextRequest } from "next/server";
import { z } from "zod";
import { resourceService } from "@/lib/services/resource.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/api/error-handler";

const linkBodySchema = z.object({ area_id: z.string().uuid() });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authorizeApiRequest(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createClient();
    // Ownership check; throws NotFoundError (404) for a foreign/missing id.
    await resourceService.getById(userId, id, { supabase });
    const relations = await resourceService.getWithRelations(id, { supabase });
    return success({ area_ids: relations.area_ids });
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
    const { area_id } = await validateBody(request, linkBodySchema);
    const supabase = await createClient();
    await resourceService.getById(userId, id, { supabase });
    // No single-link helper; merge into the existing set and replace.
    const relations = await resourceService.getWithRelations(id, { supabase });
    const next = Array.from(new Set([...relations.area_ids, area_id]));
    await resourceService.replaceAreaLinks(id, next, { supabase });
    return success({ area_ids: next });
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
    const { area_id } = await validateBody(request, linkBodySchema);
    const supabase = await createClient();
    await resourceService.getById(userId, id, { supabase });
    const relations = await resourceService.getWithRelations(id, { supabase });
    const next = relations.area_ids.filter((areaId) => areaId !== area_id);
    await resourceService.replaceAreaLinks(id, next, { supabase });
    return success({ area_ids: next });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
