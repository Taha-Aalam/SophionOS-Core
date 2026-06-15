import { describe, it, expect } from "vitest";
import { buildContactCreateInput } from "@/lib/utils/contact-input";

const base = {
  name: "Jane",
  role: "",
  organization: "",
  group: "",
  phone: "",
  email: "",
  linkedin: "",
  website: "",
  image_url: "",
  follow_up_interval_days: "",
  notes: "",
};

describe("buildContactCreateInput", () => {
  it("defaults follow_up_interval_days to 14 when blank", () => {
    expect(buildContactCreateInput(base).follow_up_interval_days).toBe(14);
  });
  it("maps 'none' to null", () => {
    expect(
      buildContactCreateInput({ ...base, follow_up_interval_days: "none" }).follow_up_interval_days,
    ).toBeNull();
  });
  it("parses a numeric interval", () => {
    expect(
      buildContactCreateInput({ ...base, follow_up_interval_days: "30" }).follow_up_interval_days,
    ).toBe(30);
  });
  it("coerces empty strings to null and defaults id arrays", () => {
    const out = buildContactCreateInput(base);
    expect(out.role).toBeNull();
    expect(out.area_ids).toEqual([]);
  });
});
