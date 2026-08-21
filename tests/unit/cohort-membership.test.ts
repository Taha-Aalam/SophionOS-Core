import { afterEach, describe, expect, it, vi } from "vitest";

import { isCohortMember } from "@/lib/api/cohort-membership";

function okFetch(body: unknown) {
  return vi.fn(async () =>
    ({
      ok: true,
      json: async () => body,
    }) as unknown as Response
  );
}

describe("isCohortMember", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns false when unconfigured or email missing", async () => {
    vi.stubEnv("COHORT_MEMBERSHIP_URL", "");
    vi.stubEnv("COHORT_MEMBERSHIP_SECRET", "secret");
    expect(await isCohortMember("a@b.com")).toBe(false);

    vi.stubEnv("COHORT_MEMBERSHIP_URL", "http://localhost:3000");
    expect(await isCohortMember(null)).toBe(false);
  });

  it("returns true only when the API answers member=true", async () => {
    vi.stubEnv("COHORT_MEMBERSHIP_URL", "http://localhost:3000");
    vi.stubEnv("COHORT_MEMBERSHIP_SECRET", "secret");
    const fetchMock = okFetch({ member: true });
    vi.stubGlobal("fetch", fetchMock);

    expect(await isCohortMember("User@Example.com")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:3000/api/cohort/membership?email=User%40Example.com"
    );
    expect((init.headers as Record<string, string>)["x-cohort-key"]).toBe(
      "secret"
    );
  });

  it("returns false for member=false responses", async () => {
    vi.stubEnv("COHORT_MEMBERSHIP_URL", "http://localhost:3000");
    vi.stubEnv("COHORT_MEMBERSHIP_SECRET", "secret");
    vi.stubGlobal("fetch", okFetch({ member: false }));

    expect(await isCohortMember("a@b.com")).toBe(false);
  });

  it("fails closed on HTTP errors and network failures", async () => {
    vi.stubEnv("COHORT_MEMBERSHIP_URL", "http://localhost:3000");
    vi.stubEnv("COHORT_MEMBERSHIP_SECRET", "secret");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) }) as unknown as Response)
    );
    expect(await isCohortMember("a@b.com")).toBe(false);

    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("down");
    }));
    expect(await isCohortMember("a@b.com")).toBe(false);
  });
});
