import { describe, it, expect } from "vitest";
import { createResourceSchema, updateResourceSchema } from "../../src/lib/validators/resource.schema";

describe("resource.service", () => {
  describe("createResourceSchema", () => {
    it("passes with valid minimal input", () => {
      const result = createResourceSchema.parse({ name: "My Resource" });
      expect(result.name).toBe("My Resource");
      expect(result.type).toBe("website");
      expect(result.status).toBe("inbox");
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
      expect(() => createResourceSchema.parse({ name: "Test", url: "not-a-url" })).toThrow();
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