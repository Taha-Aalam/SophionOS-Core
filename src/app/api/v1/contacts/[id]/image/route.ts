import { NextRequest } from "next/server";
import { contactService } from "@/lib/services/contact.service";
import { authorizeApiRequest } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { createDataClient } from "@/lib/supabase/server";
import { AppError, ValidationError } from "@/lib/api/error-handler";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const ALLOWED_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "image/webp";
  return null;
}

function isSvgOrHtml(bytes: Uint8Array): boolean {
  const scanLen = Math.min(bytes.length, 8192);
  const head = new TextDecoder().decode(bytes.slice(0, scanLen)).toLowerCase();
  const trimmed = head.trimStart();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml") || trimmed.startsWith("<!doctype")) return true;
  if (head.includes("<html") || head.includes("<svg") || head.includes("<script") || head.includes("javascript:")) return true;
  return false;
}

/**
 * POST — upload a contact avatar. Multipart form-data with a `file` field.
 * Returns the stored object path; the display URL is signed separately.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
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
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
      throw new ValidationError(`Unsupported image type: ${file.type}`);
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError("Image exceeds the 5MB limit");
    }
    const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTS.has(rawExt)) {
      throw new ValidationError(`Unsupported file extension: .${rawExt}`);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      throw new ValidationError("Image exceeds the 5MB limit");
    }
    if (bytes.length === 0) {
      throw new ValidationError("Empty file");
    }
    if (isSvgOrHtml(bytes)) {
      throw new ValidationError("SVG/HTML content not allowed");
    }
    const sniffed = sniffImageMime(bytes);
    if (!sniffed) {
      throw new ValidationError("File content does not match an allowed image format");
    }
    if (sniffed !== file.type) {
      throw new ValidationError(`MIME mismatch: header ${file.type} does not match content ${sniffed}`);
    }
    const expectedFromExt = EXT_TO_MIME[rawExt];
    if (expectedFromExt && expectedFromExt !== sniffed) {
      throw new ValidationError(`Extension .${rawExt} does not match file content ${sniffed}`);
    }
    const normalizedExt = rawExt === "jpeg" ? "jpg" : rawExt;
    const normalizedFile = new File([bytes], `${file.name.split(".").slice(0, -1).join(".") || "avatar"}.${normalizedExt}`, {
      type: sniffed,
    });

    const supabase = await createDataClient(authResult);
    // Ownership check; throws NotFoundError (404) for a foreign/missing id.
    await contactService.getById(userId, id, { supabase });
    const path = await contactService.uploadContactImage(userId, id, normalizedFile, { supabase });
    const contact = await contactService.update(userId, id, { image_url: path }, { supabase });
    return success(contact);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

/** DELETE — remove the contact's avatar (storage object + image_url field). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await authorizeApiRequest(request);
    const { userId } = authResult;
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    const supabase = await createDataClient(authResult);
    const contact = await contactService.getById(userId, id, { supabase });
    await contactService.deleteContactImage(contact.image_url, { supabase, ownerUserId: userId });
    const updated = await contactService.update(userId, id, { image_url: null }, { supabase });
    return success(updated);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}
