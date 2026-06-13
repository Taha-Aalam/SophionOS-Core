import { describe, expect, it } from "vitest";

import {
  isValidReturnTo,
  buildReturnTo,
  encodeReturnTo,
  decodeReturnTo,
  resolveBackNavigation,
  getEffectiveReturnTo,
  getReturnToParam,
  buildReturnToChain,
  decodeReturnToChain,
  encodeReturnToChain,
  popReturnToChain,
} from "@/lib/utils/return-to";

describe("return-to navigation utilities", () => {
  describe("isValidReturnTo", () => {
    it("returns true for valid area routes", () => {
      expect(isValidReturnTo("/areas")).toBe(true);
      expect(isValidReturnTo("/areas/my-slug")).toBe(true);
    });

    it("returns true for valid goal routes", () => {
      expect(isValidReturnTo("/goals")).toBe(true);
      expect(isValidReturnTo("/goals/my-goal")).toBe(true);
    });

    it("returns true for valid note routes", () => {
      expect(isValidReturnTo("/notes")).toBe(true);
      expect(isValidReturnTo("/notes/my-note")).toBe(true);
    });

    it("returns true for valid project routes", () => {
      expect(isValidReturnTo("/projects")).toBe(true);
    });

    it("returns true for valid task routes", () => {
      expect(isValidReturnTo("/tasks")).toBe(true);
    });

    it("returns true for valid topic routes", () => {
      expect(isValidReturnTo("/topics")).toBe(true);
    });

    it("returns true for valid resource routes", () => {
      expect(isValidReturnTo("/resources")).toBe(true);
    });

    it("returns false for null or empty strings", () => {
      expect(isValidReturnTo(null)).toBe(false);
      expect(isValidReturnTo("")).toBe(false);
    });

    it("returns false for invalid routes", () => {
      expect(isValidReturnTo("/invalid")).toBe(false);
      expect(isValidReturnTo("/some/deep/path")).toBe(false);
      expect(isValidReturnTo("/notes/new")).toBe(false);
    });

    it("returns false for external URLs", () => {
      expect(isValidReturnTo("https://example.com")).toBe(false);
      expect(isValidReturnTo("/../etc/passwd")).toBe(false);
    });
  });

  describe("buildReturnTo", () => {
    it("returns the path wrapped as-is", () => {
      expect(buildReturnTo("/areas/123")).toBe("/areas/123");
      expect(buildReturnTo("/goals/test")).toBe("/goals/test");
    });
  });

  describe("getReturnToParam", () => {
    it("returns the param if valid", () => {
      expect(getReturnToParam("/areas/123")).toBe("/areas/123");
    });

    it("returns null for invalid paths", () => {
      expect(getReturnToParam("/invalid")).toBe(null);
      expect(getReturnToParam(null)).toBe(null);
    });

    it("returns null for empty strings", () => {
      expect(getReturnToParam("")).toBe(null);
    });
  });

  describe("encodeReturnTo", () => {
    it("encodes the path for URL parameter", () => {
      expect(encodeReturnTo("/areas/123")).toBe("%2Fareas%2F123");
      expect(encodeReturnTo("/goals/my-goal")).toBe("%2Fgoals%2Fmy-goal");
    });
  });

  describe("decodeReturnTo", () => {
    it("decodes valid encoded paths", () => {
      expect(decodeReturnTo("%2Fareas%2F123")).toBe("/areas/123");
    });

    it("returns empty string for invalid encoded paths", () => {
      expect(decodeReturnTo("%2Finvalid")).toBe("");
    });

    it("returns empty string for non-encoded strings", () => {
      expect(decodeReturnTo("not-encoded")).toBe("");
    });
  });

  describe("resolveBackNavigation", () => {
    it("returns returnTo if valid", () => {
      expect(resolveBackNavigation("/areas/123", "/notes")).toBe("/areas/123");
    });

    it("returns fallback if returnTo is invalid", () => {
      expect(resolveBackNavigation("/invalid", "/notes")).toBe("/notes");
      expect(resolveBackNavigation(null, "/notes")).toBe("/notes");
    });
  });
});

describe("origin-aware navigation integration", () => {
  describe("area -> goals flow", () => {
    it("preserves area origin when navigating to goal", () => {
      const areaId = "area-123";
      const returnTo = buildReturnTo(`/areas/${areaId}`);
      const encoded = encodeReturnTo(returnTo);
      expect(encoded).toBe("%2Fareas%2Farea-123");
    });

    it("resolves back to area when returnTo is provided", () => {
      const result = resolveBackNavigation("/areas/area-123", "/goals");
      expect(result).toBe("/areas/area-123");
    });

    it("falls back to /goals when no valid returnTo", () => {
      const result = resolveBackNavigation(null, "/goals");
      expect(result).toBe("/goals");
    });
  });

  describe("area -> notes flow", () => {
    it("preserves area origin when navigating to new note", () => {
      const areaId = "my-area";
      const returnTo = buildReturnTo(`/areas/${areaId}`);
      const encoded = encodeReturnTo(returnTo);
      expect(encoded).toBe("%2Fareas%2Fmy-area");
    });

    it("resolves back to area from new note", () => {
      const result = resolveBackNavigation("/areas/my-area", "/notes");
      expect(result).toBe("/areas/my-area");
    });

    it("falls back to /notes when no valid returnTo", () => {
      const result = resolveBackNavigation(null, "/notes");
      expect(result).toBe("/notes");
    });
  });

  describe("goal -> notes flow", () => {
    it("preserves goal origin when navigating to note", () => {
      const goalSlug = "my-goal";
      const returnTo = buildReturnTo(`/goals/${goalSlug}`);
      const encoded = encodeReturnTo(returnTo);
      expect(encoded).toBe("%2Fgoals%2Fmy-goal");
    });

    it("resolves back to goal from note detail", () => {
      const result = resolveBackNavigation("/goals/my-goal", "/notes");
      expect(result).toBe("/goals/my-goal");
    });
  });

  describe("direct navigation fallback", () => {
    it("direct /notes/new falls back to /notes", () => {
      const result = resolveBackNavigation(null, "/notes");
      expect(result).toBe("/notes");
    });

    it("direct /notes/123 falls back to /notes", () => {
      const result = resolveBackNavigation(null, "/notes");
      expect(result).toBe("/notes");
    });

    it("direct /goals/abc falls back to /goals", () => {
      const result = resolveBackNavigation(null, "/goals");
      expect(result).toBe("/goals");
    });
  });

  describe("area -> goal -> note flow", () => {
    it("preserves area origin through goal page (area-1)", () => {
      const result = getEffectiveReturnTo("/areas/area-1", "/goals/my-goal");
      expect(result).toBe("/areas/area-1");
    });

    it("preserves area origin through goal page (my-area)", () => {
      const result = getEffectiveReturnTo("/areas/my-area", "/goals/my-goal");
      expect(result).toBe("/areas/my-area");
    });

    it("falls back to goal page when no area origin", () => {
      const result = getEffectiveReturnTo(null, "/goals/my-goal");
      expect(result).toBe("/goals/my-goal");
    });

    it("falls back to goal page when goal origin is passed", () => {
      const result = getEffectiveReturnTo("/goals/other-goal", "/goals/my-goal");
      expect(result).toBe("/goals/my-goal");
    });

    it("preserves root /areas path", () => {
      const result = getEffectiveReturnTo("/areas", "/goals/my-goal");
      expect(result).toBe("/areas");
    });
  });

  describe("deep navigation chain preservation", () => {
    it("preserves the chain across dashboard -> area -> goal -> project -> goal", () => {
      // Helper view: [returnTo, ...chain]

      // Step 1: dashboard -> area-A. Area page URL: returnTo=/dashboard, chain=[].
      // buildReturnToChain(areaParams) is the chain stamped on the *child goal* link
      // = [current returnTo, ...current chain] = [/dashboard].
      const areaParams = new URLSearchParams();
      areaParams.set("returnTo", encodeReturnTo("/dashboard"));
      expect(decodeReturnToChain(buildReturnToChain(areaParams))).toEqual([
        "/dashboard",
      ]);

      // Step 2: area page -> goal-X. Goal page emits project link with
      // returnTo = current page, chain = [current returnTo, ...current chain].
      const goalParams = new URLSearchParams();
      goalParams.set("returnTo", encodeReturnTo("/areas/area-A"));
      goalParams.set("chain", encodeReturnToChain(["/dashboard"]));
      expect(decodeReturnToChain(buildReturnToChain(goalParams))).toEqual([
        "/areas/area-A",
        "/dashboard",
      ]);

      // Step 3: project page URL = goal's emitted link.
      // Step 4: project page -> goal-Z. Goal-Z link chain = [returnTo, ...chain].
      const projectParams = new URLSearchParams();
      projectParams.set("returnTo", encodeReturnTo("/goals/goal-X"));
      projectParams.set("chain", encodeReturnToChain(["/areas/area-A", "/dashboard"]));
      expect(decodeReturnToChain(buildReturnToChain(projectParams))).toEqual([
        "/goals/goal-X",
        "/areas/area-A",
        "/dashboard",
      ]);

      // Step 5: goal-Z receives that URL. Back button pops the head.
      const goalZParams = new URLSearchParams();
      goalZParams.set("returnTo", encodeReturnTo("/projects/proj-1"));
      goalZParams.set("chain", encodeReturnToChain([
        "/goals/goal-X",
        "/areas/area-A",
        "/dashboard",
      ]));
      const pop1 = popReturnToChain(goalZParams);
      expect(pop1.returnTo).toBe("/goals/goal-X");
      expect(pop1.chain).toEqual(["/areas/area-A", "/dashboard"]);

      // Back on project page (now with popped state).
      const projectAfterBack = new URLSearchParams();
      projectAfterBack.set("returnTo", encodeReturnTo(pop1.returnTo ?? ""));
      projectAfterBack.set("chain", encodeReturnToChain(pop1.chain));
      const pop2 = popReturnToChain(projectAfterBack);
      expect(pop2.returnTo).toBe("/areas/area-A");
      expect(pop2.chain).toEqual(["/dashboard"]);

      // Back on goal page.
      const goalAfterBack = new URLSearchParams();
      goalAfterBack.set("returnTo", encodeReturnTo(pop2.returnTo ?? ""));
      goalAfterBack.set("chain", encodeReturnToChain(pop2.chain));
      const pop3 = popReturnToChain(goalAfterBack);
      expect(pop3.returnTo).toBe("/dashboard");
      expect(pop3.chain).toEqual([]);

      // Back on area page.
      const areaAfterBack = new URLSearchParams();
      areaAfterBack.set("returnTo", encodeReturnTo(pop3.returnTo ?? ""));
      areaAfterBack.set("chain", encodeReturnToChain(pop3.chain));
      const pop4 = popReturnToChain(areaAfterBack);
      expect(pop4.returnTo).toBeNull();
      expect(pop4.chain).toEqual([]);
    });
  });
});