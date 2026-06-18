import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

/**
 * Returns the URL only if it is a safe http(s) link, otherwise undefined.
 * Use for any user-supplied value rendered into an anchor `href` — React
 * does not block `javascript:`/`data:` schemes, so unvalidated hrefs are an
 * XSS click vector. Guards against pre-existing unsafe rows in storage.
 */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return /^https?:$/.test(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}
