import { NextRequest } from "next/server";
import { contactService } from "@/lib/services/contact.service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createClient } from "@/lib/supabase/server";
import { AppError, ValidationError } from "@/lib/api/error-handler";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * POST — upload a contact avatar. Multipart form-data with a `file` field.
 * Returns the stored object path; the display URL is signed separately.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return error(new AppError("Expected multipart/form-data", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("Missing form field: file");
    }
    if (!ACCEPTED.includes(file.type)) {
      throw new ValidationError(`Unsupported image type: ${file.type}`);
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError("Image exceeds the 5MB limit");
    }

    const supabase = await createClient();
    // Ownership check; throws NotFoundError (404) for a foreign/missing id.
    await contactService.getById(userId, id, { supabase });
    const path = await contactService.uploadContactImage(userId, id, file, { supabase });
    const contact = await contactService.update(userId, id, { image_url: path }, { supabase });
    return success(contact);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** DELETE — remove the contact's avatar (storage object + image_url field). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createClient();
    const contact = await contactService.getById(userId, id, { supabase });
    await contactService.deleteContactImage(contact.image_url, { supabase });
    const updated = await contactService.update(userId, id, { image_url: null }, { supabase });
    return success(updated);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
