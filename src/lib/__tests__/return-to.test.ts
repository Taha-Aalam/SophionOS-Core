import { describe, expect, it } from "vitest";

import {
  buildNoteDetailUrl,
  buildReturnTo,
  buildReturnToChain,
  decodeReturnTo,
  decodeReturnToChain,
  encodeReturnTo,
  encodeReturnToChain,
  getEffectiveReturnTo,
  getReturnToFromSearchParams,
  getReturnToFallback,
  getReturnToParam,
  isValidReturnTo,
  popReturnToHref,
  popReturnToChain,
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

describe("buildReturnToChain", () => {
  it("returns an empty chain when no returnTo is present", () => {
    const params = new URLSearchParams();
    expect(buildReturnToChain(params)).toBe(encodeReturnToChain([]));
  });

  it("returns a single-entry chain when only returnTo is present", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/areas/area-A"));
    expect(decodeReturnToChain(buildReturnToChain(params))).toEqual([
      "/areas/area-A",
    ]);
  });

  it("preserves the existing chain and prepends the current returnTo", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/areas/area-A"));
    params.set("chain", encodeReturnToChain(["/dashboard"]));
    expect(decodeReturnToChain(buildReturnToChain(params))).toEqual([
      "/areas/area-A",
      "/dashboard",
    ]);
  });

  it("drops invalid returnTo and returns an empty chain", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/invalid/path"));
    expect(buildReturnToChain(params)).toBe(encodeReturnToChain([]));
  });
});

describe("popReturnToChain", () => {
  it("returns null/empty when no returnTo is present", () => {
    const params = new URLSearchParams();
    expect(popReturnToChain(params)).toEqual({ returnTo: null, chain: [] });
  });

  it("pops the head and returns the next entry as the new returnTo", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/projects/project-1"));
    params.set("chain", encodeReturnToChain(["/goals/goal-X", "/areas/area-A"]));
    expect(popReturnToChain(params)).toEqual({
      returnTo: "/goals/goal-X",
      chain: ["/areas/area-A"],
    });
  });

  it("pops the head to null when chain is empty", () => {
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/areas/area-A"));
    expect(popReturnToChain(params)).toEqual({ returnTo: null, chain: [] });
  });
});

describe("popReturnToHref", () => {
  it("returns just the fallback when the current page has no chain state", () => {
    const params = new URLSearchParams();
    expect(popReturnToHref(params, "/goals")).toBe("/goals");
  });

  it("returns the popped returnTo as the destination when chain is empty", () => {
    // Helper view: [/areas/area-A]. Pop -> returnTo=null (no next), chain=[].
    // This case is only reached when the current page is the deepest in the
    // stack (no chain), so the Back button should go to the immediate
    // predecessor as a plain path (no params on the destination because it's
    // the end of the chain).
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/projects/project-1"));
    expect(popReturnToHref(params, "/goals")).toBe("/goals");
  });

  it("navigates to the popped returnTo and re-emits the rest as new chain params", () => {
    // Helper view: [/projects/project-1, /goals/goal-X, /areas/area-A, /dashboard].
    // Pop -> (returnTo=/goals/goal-X, chain=[/areas/area-A, /dashboard]).
    // Back button must go to /goals/goal-X with those as the new params.
    const params = new URLSearchParams();
    params.set("returnTo", encodeReturnTo("/projects/project-1"));
    params.set(
      "chain",
      encodeReturnToChain(["/goals/goal-X", "/areas/area-A", "/dashboard"]),
    );

    const href = popReturnToHref(params, "/goals");
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/goals/goal-X");
    expect(url.searchParams.get("returnTo")).toBe("/areas/area-A");
    expect(JSON.parse(url.searchParams.get("chain") ?? "[]")).toEqual([
      "/dashboard",
    ]);
  });

  it("round-trips through the user's reported regression URL", () => {
    // The user's URL on the inner goal:
    //   ?returnTo=%2Fprojects%2Fcheck-1
    //   &chain=%5B%22%2Fgoals%2Ftest-22%22%2C%22%2Fareas%2Ffinance-wealth%22%2C%22%2Fdashboard%22%5D
    // After pop, Back must navigate to /projects/check-1 with the new
    // returnTo=/goals/test-22 and chain=[/areas/finance-wealth, /dashboard].
    const params = new URLSearchParams(
      'returnTo=%2Fprojects%2Fcheck-1' +
        '&chain=%5B%22%2Fgoals%2Ftest-22%22%2C%22%2Fareas%2Ffinance-wealth%22%2C%22%2Fdashboard%22%5D',
    );
    const href = popReturnToHref(params, "/goals");
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/projects/check-1");
    expect(url.searchParams.get("returnTo")).toBe("/goals/test-22");
    expect(JSON.parse(url.searchParams.get("chain") ?? "[]")).toEqual([
      "/areas/finance-wealth",
      "/dashboard",
    ]);
  });
});

describe("deep navigation chain preservation", () => {
  it("preserves the chain across dashboard -> area -> goal -> project -> goal", () => {
    // Helper view: [returnTo, ...chain]

    // Step 1: dashboard click area-A. Area page URL: returnTo=/dashboard, chain=[].
    // buildReturnToChain(areaParams) is the chain stamped on the *child goal* link
    // = [current returnTo, ...current chain] = [/dashboard].
    const areaParams = new URLSearchParams();
    areaParams.set("returnTo", encodeReturnTo("/dashboard"));
    const goalLinkChain = buildReturnToChain(areaParams);
    expect(decodeReturnToChain(goalLinkChain)).toEqual(["/dashboard"]);

    // Step 2: goal-X page URL: returnTo=/areas/area-A, chain=[/dashboard].
    // Goal page emits outgoing project link using
    // buildReturnTo("/goals/goal-X") and buildReturnToChain(goalParams).
    const goalParams = new URLSearchParams();
    goalParams.set("returnTo", encodeReturnTo("/areas/area-A"));
    goalParams.set("chain", encodeReturnToChain(["/dashboard"]));
    const projectLinkReturnTo = buildReturnTo("/goals/goal-X");
    const projectLinkChain = buildReturnToChain(goalParams);
    expect(projectLinkReturnTo).toBe("/goals/goal-X");
    expect(decodeReturnToChain(projectLinkChain)).toEqual([
      "/areas/area-A",
      "/dashboard",
    ]);

    // Step 3: project page (URL derived from goal's link).
    const projectParams = new URLSearchParams();
    projectParams.set("returnTo", projectLinkReturnTo);
    projectParams.set("chain", projectLinkChain);

    // Step 4: project click goal-Z. Goal-Z link's returnTo = /projects/proj-1,
    // chain = [current project returnTo, ...chain] = [chain of goalParams-derived project URL].
    const goalZLinkReturnTo = buildReturnTo("/projects/proj-1");
    const goalZLinkChain = buildReturnToChain(projectParams);
    expect(goalZLinkReturnTo).toBe("/projects/proj-1");
    expect(decodeReturnToChain(goalZLinkChain)).toEqual([
      "/goals/goal-X",
      "/areas/area-A",
      "/dashboard",
    ]);

    // Step 5: navigate to goal-Z. URL: returnTo=/projects/proj-1, chain=...3 entries.
    const goalZParams = new URLSearchParams();
    goalZParams.set("returnTo", goalZLinkReturnTo);
    goalZParams.set("chain", goalZLinkChain);

    // Step 6: user clicks Back on goal-Z. Pop head: navigate to /projects/proj-1.
    // Project page's new URL: returnTo=chain[0]=/goals/goal-X, chain=rest.
    const pop1 = popReturnToChain(goalZParams);
    expect(pop1.returnTo).toBe("/goals/goal-X");
    expect(pop1.chain).toEqual(["/areas/area-A", "/dashboard"]);

    // Step 7: project page now has those URL values. Click Back again.
    const projectAfterBack = new URLSearchParams();
    projectAfterBack.set("returnTo", encodeReturnTo(pop1.returnTo ?? ""));
    projectAfterBack.set("chain", encodeReturnToChain(pop1.chain));
    const pop2 = popReturnToChain(projectAfterBack);
    expect(pop2.returnTo).toBe("/areas/area-A");
    expect(pop2.chain).toEqual(["/dashboard"]);

    // Step 8: goal page after second back. URL: returnTo=/areas/area-A, chain=[/dashboard].
    // Click Back again.
    const goalAfterBack = new URLSearchParams();
    goalAfterBack.set("returnTo", encodeReturnTo(pop2.returnTo ?? ""));
    goalAfterBack.set("chain", encodeReturnToChain(pop2.chain));
    const pop3 = popReturnToChain(goalAfterBack);
    expect(pop3.returnTo).toBe("/dashboard");
    expect(pop3.chain).toEqual([]);

    // Step 9: area page after third back. URL: returnTo=/dashboard, chain=[].
    const areaAfterBack = new URLSearchParams();
    areaAfterBack.set("returnTo", encodeReturnTo(pop3.returnTo ?? ""));
    areaAfterBack.set("chain", encodeReturnToChain(pop3.chain));
    const pop4 = popReturnToChain(areaAfterBack);
    expect(pop4.returnTo).toBeNull();
    expect(pop4.chain).toEqual([]);
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
