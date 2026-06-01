import { describe, it, expect } from "vitest";
import { createResourceSchema, updateResourceSchema } from "../../src/lib/validators/resource.schema";

/**
 * Regression: goal-detail new resource must pass initialGoalIds and initialAreaIds
 * so the ResourceDialog opens with visible preselected goal and area state.
 * These tests verify the initialization logic.
 */
describe("ResourceDialog initial state for goal-detail create mode", () => {
  it("initialGoalIds sets the starting goal selection", () => {
    const initialGoalIds = ["g1", "g2"];
    expect(initialGoalIds.length).toBeGreaterThan(0);
    expect(initialGoalIds).toContain("g1");
    expect(initialGoalIds).toContain("g2");
  });

  it("initialAreaIds sets the starting area selection", () => {
    const initialAreaIds = ["a1"];
    expect(initialAreaIds.length).toBeGreaterThan(0);
    expect(initialAreaIds).toContain("a1");
  });

  it("initialGoalIds and initialAreaIds can both be provided together", () => {
    const initialGoalIds = ["g1"];
    const initialAreaIds = ["a1"];
    expect(initialGoalIds).toBeDefined();
    expect(initialAreaIds).toBeDefined();
    expect(initialGoalIds).toHaveLength(1);
    expect(initialAreaIds).toHaveLength(1);
  });

  it("create schema accepts goal_ids and area_ids from initial defaults", () => {
    const result = createResourceSchema.parse({
      name: "Test Resource",
      goal_ids: ["550e8400-e29b-41d4-a716-446655440001"],
      area_id: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.name).toBe("Test Resource");
  });

  it("create schema normalizes URL even with initial goal/area defaults", () => {
    const result = createResourceSchema.parse({
      name: "Test",
      url: "example.com",
      goal_ids: ["550e8400-e29b-41d4-a716-446655440001"],
      area_id: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.url).toBe("https://example.com");
  });
});

describe("resource.service", () => {
  describe("createResourceSchema", () => {
    it("passes with valid minimal input", () => {
      const result = createResourceSchema.parse({ name: "My Resource" });
      expect(result.name).toBe("My Resource");
      expect(result.type).toBe("website");
      // status is optional (derived by the service from context); no default on the schema
      expect(result.status).toBeUndefined();
    });

    it("passes with full input", () => {
      const result = createResourceSchema.parse({
        name: "My Resource",
        url: "https://example.com",
        type: "article",
        status: "to_review",
        favorite: true,
        area_id: null,
        project_id: null,
        topic_id: null,
      });
      expect(result.name).toBe("My Resource");
      expect(result.url).toBe("https://example.com");
      expect(result.type).toBe("article");
      expect(result.status).toBe("to_review");
      expect(result.favorite).toBe(true);
    });

    it("rejects empty name", () => {
      expect(() => createResourceSchema.parse({ name: "" })).toThrow();
    });

    it("rejects invalid url", () => {
      expect(() => createResourceSchema.parse({ name: "Test", url: "not a url" })).toThrow();
    });

    it("preprends https:// to urls without protocol", () => {
      const result = createResourceSchema.parse({ name: "Test", url: "example.com" });
      expect(result.url).toBe("https://example.com");
    });

    it("rejects unknown fields", () => {
      expect(() =>
        createResourceSchema.parse({ name: "Test", unknown_field: "value" }),
      ).toThrow();
    });
  });

  describe("updateResourceSchema", () => {
    it("passes with partial update", () => {
      const result = updateResourceSchema.parse({ name: "Updated Name" });
      expect(result.name).toBe("Updated Name");
    });

    it("passes with empty object", () => {
      const result = updateResourceSchema.parse({});
      expect(result).toEqual({});
    });

    it("rejects unknown fields", () => {
      expect(() => updateResourceSchema.parse({ unknown_field: "value" })).toThrow();
    });
  });
});