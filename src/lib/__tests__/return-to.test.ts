import { describe, expect, it } from "vitest";

import {
  buildNoteDetailUrl,
  buildReturnTo,
  decodeReturnTo,
  encodeReturnTo,
  getEffectiveReturnTo,
  getReturnToFromSearchParams,
  getReturnToFallback,
  getReturnToParam,
  isValidReturnTo,
  resolveGoalDetailNavigation,
  resolveBackNavigation,
} from "@/lib/utils/return-to";

describe("isValidReturnTo", () => {
  it("accepts /areas", () => {
    expect(isValidReturnTo("/areas")).toBe(true);
  });

  it("accepts /areas/slug", () => {
    expect(isValidReturnTo("/areas/some-area")).toBe(true);
  });

  it("accepts /projects", () => {
    expect(isValidReturnTo("/projects")).toBe(true);
  });

  it("accepts /notes", () => {
    expect(isValidReturnTo("/notes")).toBe(true);
  });

  it("accepts /goals", () => {
    expect(isValidReturnTo("/goals")).toBe(true);
  });

  it("accepts /tasks", () => {
    expect(isValidReturnTo("/tasks")).toBe(true);
  });

  it("accepts /topics", () => {
    expect(isValidReturnTo("/topics")).toBe(true);
  });

  it("accepts /resources", () => {
    expect(isValidReturnTo("/resources")).toBe(true);
  });

  it("accepts /contacts", () => {
    expect(isValidReturnTo("/contacts")).toBe(true);
  });

  it("accepts /contacts/slug", () => {
    expect(isValidReturnTo("/contacts/john-doe")).toBe(true);
  });

  it("accepts /knowledge", () => {
    expect(isValidReturnTo("/knowledge")).toBe(true);
  });

  it("accepts nested /knowledge paths", () => {
    expect(isValidReturnTo("/knowledge/topic-views")).toBe(true);
  });

  it("rejects /contacts/new", () => {
    expect(isValidReturnTo("/contacts/new")).toBe(false);
  });

  it("rejects /areas/new", () => {
    expect(isValidReturnTo("/areas/new")).toBe(false);
  });

  it("rejects /projects/edit", () => {
    expect(isValidReturnTo("/projects/edit")).toBe(false);
  });

  it("rejects /notes/create", () => {
    expect(isValidReturnTo("/notes/create")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidReturnTo(null)).toBe(false);
  });

  it("rejects arbitrary paths", () => {
    expect(isValidReturnTo("/settings")).toBe(false);
    expect(isValidReturnTo("/users/123")).toBe(false);
  });
});

describe("buildReturnTo", () => {
  it("returns the origin unchanged", () => {
    expect(buildReturnTo("/areas/my-area")).toBe("/areas/my-area");
    expect(buildReturnTo("/projects/my-project")).toBe("/projects/my-project");
  });
});

describe("encodeReturnTo / decodeReturnTo", () => {
  it("encodes and decodes round-trips for simple paths", () => {
    const original = "/areas/my-area";
    const encoded = encodeReturnTo(original);
    expect(encoded).not.toBe(original);
    expect(decodeReturnTo(encoded)).toBe(original);
  });

  it("encodes and decodes paths with slashes", () => {
    const original = "/areas/my-area/sub-path";
    const decoded = decodeReturnTo(encodeReturnTo(original));
    expect(decoded).toBe(original);
  });

  it("decodes only valid return-to paths", () => {
    const invalid = encodeReturnTo("/invalid/path");
    expect(decodeReturnTo(invalid)).toBe("");
  });

  it("decodes and validates encoded area detail paths", () => {
    const original = "/areas/some-area-slug";
    const decoded = decodeReturnTo(encodeReturnTo(original));
    expect(isValidReturnTo(decoded)).toBe(true);
  });

  it("round-trips an encoded knowledge hub returnTo", () => {
    const encoded = encodeReturnTo("/knowledge");
    expect(decodeReturnTo(encoded)).toBe("/knowledge");
  });
});

describe("getReturnToFromSearchParams", () => {
  it("parses a valid encoded returnTo from URLSearchParams", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/areas/my-area"));
    expect(getReturnToFromSearchParams(params)).toBe("/areas/my-area");
  });

  it("returns null when returnTo is missing", () => {
    const params = new URLSearchParams();
    expect(getReturnToFromSearchParams(params)).toBeNull();
  });

  it("returns null for invalid encoded returnTo", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/invalid/path"));
    const result = getReturnToFromSearchParams(params);
    expect(result).toBe("");
  });
});

describe("resolveBackNavigation", () => {
  it("returns the validated returnTo when present and valid", () => {
    const result = resolveBackNavigation("/areas/my-area", "/projects");
    expect(result).toBe("/areas/my-area");
  });

  it("returns the fallback when returnTo is null", () => {
    const result = resolveBackNavigation(null, "/projects");
    expect(result).toBe("/projects");
  });

  it("returns the fallback when returnTo is invalid", () => {
    const result = resolveBackNavigation("/invalid/path", "/projects");
    expect(result).toBe("/projects");
  });

  it("returns the fallback when returnTo targets a forbidden segment", () => {
    const result = resolveBackNavigation("/projects/new", "/projects");
    expect(result).toBe("/projects");
  });

  it("returns valid goals returnTo", () => {
    const result = resolveBackNavigation("/goals/my-goal", "/projects");
    expect(result).toBe("/goals/my-goal");
  });

  it("returns the knowledge hub returnTo when valid", () => {
    const result = resolveBackNavigation("/knowledge", "/topics");
    expect(result).toBe("/knowledge");
  });
});

describe("getReturnToParam", () => {
  it("returns the value when valid", () => {
    expect(getReturnToParam("/areas/my-area")).toBe("/areas/my-area");
  });

  it("returns null when invalid", () => {
    expect(getReturnToParam("/invalid/path")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getReturnToParam(null)).toBeNull();
  });
});

describe("getReturnToFallback", () => {
  it("returns the fallback unchanged", () => {
    expect(getReturnToFallback("/projects")).toBe("/projects");
  });
});

describe("getEffectiveReturnTo", () => {
  it("returns the current detail path when no returnTo is provided", () => {
    expect(getEffectiveReturnTo(null, "/goals/my-goal")).toBe("/goals/my-goal");
  });

  it("preserves area returnTo paths for nested goal-detail navigation", () => {
    expect(getEffectiveReturnTo("/areas/my-area", "/goals/my-goal")).toBe("/areas/my-area");
  });

  it("falls back to the current detail path for non-area returnTo paths", () => {
    expect(getEffectiveReturnTo("/projects/my-project", "/goals/my-goal")).toBe(
      "/goals/my-goal",
    );
  });
});

describe("resolveGoalDetailNavigation", () => {
  it("returns the goals list for breadcrumbs when no returnTo is present", () => {
    const params = new URLSearchParams();

    expect(resolveGoalDetailNavigation(params, "/goals/my-goal")).toEqual({
      breadcrumbTarget: "/goals",
      nestedReturnTo: "/goals/my-goal",
    });
  });

  it("decodes and uses area returnTo for breadcrumbs and nested navigation", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/areas/my-area"));

    expect(resolveGoalDetailNavigation(params, "/goals/my-goal")).toEqual({
      breadcrumbTarget: "/areas/my-area",
      nestedReturnTo: "/areas/my-area",
    });
  });

  it("falls back to goals for breadcrumbs but keeps nested links on the goal page for non-area origins", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/projects/my-project"));

    expect(resolveGoalDetailNavigation(params, "/goals/my-goal")).toEqual({
      breadcrumbTarget: "/projects/my-project",
      nestedReturnTo: "/goals/my-goal",
    });
  });

  it("uses contact returnTo for breadcrumbs when navigating from contact detail", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/contacts/john-doe"));

    expect(resolveGoalDetailNavigation(params, "/goals/my-goal")).toEqual({
      breadcrumbTarget: "/contacts/john-doe",
      nestedReturnTo: "/goals/my-goal",
    });
  });
});

describe("buildNoteDetailUrl", () => {
  it("returns plain note URL when returnTo is null", () => {
    expect(buildNoteDetailUrl("my-slug", null)).toBe("/notes/my-slug");
  });

  it("appends encoded returnTo when a topic path is provided", () => {
    const url = buildNoteDetailUrl("my-slug", "/topics/abc-123");
    expect(url).toContain("/notes/my-slug");
    const searchParams = new URL("http://x" + url).searchParams;
    expect(decodeReturnTo(searchParams.get("returnTo")!)).toBe("/topics/abc-123");
  });

  it("appends encoded returnTo for a note UUID identifier", () => {
    const url = buildNoteDetailUrl("550e8400-e29b-41d4-a716-446655440000", "/topics/topic-123");
    expect(url).toContain("/notes/550e8400-e29b-41d4-a716-446655440000");
    const searchParams = new URL("http://x" + url).searchParams;
    expect(decodeReturnTo(searchParams.get("returnTo")!)).toBe("/topics/topic-123");
  });
});
