import { describe, expect, it, vi, beforeEach } from "vitest";

const createClientMock = vi.fn(() => ({ from: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("browser supabase client", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("passes an accessToken callback that reads the Clerk session token", async () => {
    const getToken = vi.fn().mockResolvedValue("clerk-jwt");
    (globalThis as unknown as { window: { Clerk?: unknown } }).window = {
      Clerk: { session: { getToken } },
    };

    const { createClient } = await import("@/lib/supabase/client");
    createClient();

    const opts = createClientMock.mock.calls[0]?.[2] as {
      accessToken: () => Promise<string | null>;
    };
    const token = await opts.accessToken();
    expect(token).toBe("clerk-jwt");
    expect(getToken).toHaveBeenCalledOnce();
  });
});
