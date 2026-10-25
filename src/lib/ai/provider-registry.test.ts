import { describe, expect, it } from "vitest";
import {
  PROVIDER_IDS,
  PROVIDER_REGISTRY,
  getProviderDefinition,
} from "./provider-registry";

describe("provider registry", () => {
  it("exposes exactly the six v1 providers", () => {
    expect([...PROVIDER_IDS].sort()).toEqual([
      "anthropic",
      "custom",
      "google",
      "openai",
      "openrouter",
      "xai",
    ]);
  });

  it.each([...PROVIDER_IDS])("%s has a complete definition", (id) => {
    const def = PROVIDER_REGISTRY[id];
    expect(def.id).toBe(id);
    expect(def.label.length).toBeGreaterThan(0);
    expect(def.keyUrl).toMatch(/^https:\/\//);
    expect(["anthropic", "openai", "google"]).toContain(def.adapter);
    if (id !== "custom") {
      expect(def.models).toContain(def.defaultModel);
    }
  });

  it("maps shared-adapter providers to the openai adapter with their own base URLs", () => {
    for (const id of ["openai", "openrouter", "xai"] as const) {
      const def = getProviderDefinition(id);
      expect(def.adapter).toBe("openai");
      expect(def.baseUrl).toMatch(/^https:\/\//);
    }
    expect(getProviderDefinition("openai").baseUrl).toBe(
      "https://api.openai.com/v1",
    );
    expect(getProviderDefinition("openrouter").baseUrl).toBe(
      "https://openrouter.ai/api/v1",
    );
    expect(getProviderDefinition("xai").baseUrl).toBe("https://api.x.ai/v1");
  });

  it("requires a base URL for the custom provider only", () => {
    const custom = getProviderDefinition("custom");
    expect(custom.requiresBaseUrl).toBe(true);
    expect(custom.baseUrl).toBeNull();
    for (const id of PROVIDER_IDS) {
      if (id === "custom") continue;
      const def = getProviderDefinition(id);
      expect(def.requiresBaseUrl).toBe(false);
      expect(def.baseUrl).toMatch(/^https:\/\//);
    }
  });

  it("leaves custom with an empty model catalog the user must fill", () => {
    const custom = getProviderDefinition("custom");
    expect(custom.models).toEqual([]);
    expect(custom.defaultModel).toBe("");
  });

  it("builds an authenticated validation request per provider", () => {
    const anthropic = getProviderDefinition("anthropic").validation;
    expect(anthropic.url()).toBe("https://api.anthropic.com/v1/models");
    expect(anthropic.headers("k")).toEqual(
      expect.objectContaining({ "x-api-key": "k" }),
    );

    const openai = getProviderDefinition("openai").validation;
    expect(openai.url()).toBe("https://api.openai.com/v1/models");
    expect(openai.headers("k")).toEqual({ Authorization: "Bearer k" });

    const google = getProviderDefinition("google").validation;
    expect(google.url()).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models",
    );
    expect(google.headers("k")).toEqual(
      expect.objectContaining({ "x-goog-api-key": "k" }),
    );

    const custom = getProviderDefinition("custom").validation;
    expect(custom.url("https://example.com/v1")).toBe(
      "https://example.com/v1/models",
    );
    expect(custom.headers("k")).toEqual({ Authorization: "Bearer k" });
  });
});
