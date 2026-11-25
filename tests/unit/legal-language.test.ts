import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => mockAuth() }));

const mockGetPreferences = vi.fn();
vi.mock("@/lib/services/user-settings.service", () => ({
  userSettingsService: {
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));

import { getLegalI18n } from "@/lib/i18n/server";
import en from "@/lib/i18n/dictionary";
import ja from "@/lib/i18n/locales/ja";

const SRC = new URL("../../src", import.meta.url).pathname;

describe("legal-page language resolution", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockGetPreferences.mockReset();
  });

  it("renders English for a signed-out visitor, whatever the browser says", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const { locale, t } = await getLegalI18n();
    expect(locale).toBe("en");
    expect(t("legal.governingNotice")).toBe(en["legal.governingNotice"]);
    expect(mockGetPreferences).not.toHaveBeenCalled();
  });

  it("uses the signed-in user's saved preference", async () => {
    mockAuth.mockResolvedValue({ userId: "user_1" });
    mockGetPreferences.mockResolvedValue({ language: "ja" });
    const { locale, t } = await getLegalI18n();
    expect(locale).toBe("ja");
    expect(t("legal.governingNotice")).toBe(ja["legal.governingNotice"]);
  });

  it("only passes the governing notice for non-English renderings", () => {
    const page = readFileSync(
      join(SRC, "app/(trust)/privacy/page.tsx"),
      "utf8",
    );
    expect(page).toContain(
      'notice={locale === "en" ? undefined : t("legal.governingNotice")}',
    );
  });

  it("legal routes suppress first-visit navigator language derivation", () => {
    const layout = readFileSync(join(SRC, "app/(trust)/layout.tsx"), "utf8");
    expect(layout).toContain("hasStoredLocale={true}");
  });

  it("keeps legal literals identical in translation", () => {
    const key = "legal.privacy.privacysophionoscom";
    expect(en[key]).toBe("privacy@sophionos.com");
    expect(ja[key]).toBe(en[key]);
  });
});
