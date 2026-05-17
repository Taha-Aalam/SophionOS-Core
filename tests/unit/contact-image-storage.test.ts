import { describe, expect, it } from "vitest";

import { contactService } from "@/lib/services/contact.service";

describe("contact image storage helpers", () => {
  it("extracts the contact-avatars object path from a public URL", () => {
    expect(
      contactService.getContactImagePath(
        "https://example.supabase.co/storage/v1/object/public/contact-avatars/user-1/contact-1.png",
      ),
    ).toBe("user-1/contact-1.png");
  });

  it("returns null for empty or non-contact-avatar urls", () => {
    expect(contactService.getContactImagePath(null)).toBeNull();
    expect(contactService.getContactImagePath("https://example.com/not-storage")).toBeNull();
  });
});
