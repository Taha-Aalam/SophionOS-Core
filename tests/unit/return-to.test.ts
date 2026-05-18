import { describe, expect, it } from "vitest";

import {
  isValidReturnTo,
  buildReturnTo,
  encodeReturnTo,
  decodeReturnTo,
  resolveBackNavigation,
  getEffectiveReturnTo,
  getReturnToParam,
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
});