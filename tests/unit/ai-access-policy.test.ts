import { describe, it, expect } from "vitest";
import {
  defaultAccessModeForClientType,
  deriveKeyPrefix,
  evaluateApiKeyRequestPolicy,
  isMethodAllowedForAccessMode,
  isWriteMethod,
  DEFAULT_AI_ACCESS_SETTINGS,
} from "@/lib/api/ai-access-policy";

describe("ai-access-policy", () => {
  it("defaults MCP and unknown clients to read_only", () => {
    expect(defaultAccessModeForClientType("mcp")).toBe("read_only");
    expect(defaultAccessModeForClientType("unknown")).toBe("read_only");
    expect(defaultAccessModeForClientType(undefined)).toBe("read_only");
    expect(defaultAccessModeForClientType("automation")).toBe("read_only");
  });

  it("derives a non-sensitive prefix from a raw sop_ key", () => {
    const raw = "sop_ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijk";
    const prefix = deriveKeyPrefix(raw);
    expect(prefix.startsWith("sop_")).toBe(true);
    expect(prefix).not.toBe(raw);
    expect(prefix.length).toBeLessThan(raw.length);
  });

  it("treats POST/PUT/PATCH/DELETE as writes", () => {
    expect(isWriteMethod("GET")).toBe(false);
    expect(isWriteMethod("post")).toBe(true);
    expect(isWriteMethod("DELETE")).toBe(true);
  });

  it("enforces access modes on methods", () => {
    expect(isMethodAllowedForAccessMode("read_only", "GET")).toBe(true);
    expect(isMethodAllowedForAccessMode("read_only", "POST")).toBe(false);
    expect(isMethodAllowedForAccessMode("write_limited", "POST")).toBe(true);
    expect(isMethodAllowedForAccessMode("write_limited", "DELETE")).toBe(false);
    expect(isMethodAllowedForAccessMode("write_enabled", "DELETE")).toBe(true);
  });

  it("denies all API-key traffic when global AI access is off", () => {
    const denial = evaluateApiKeyRequestPolicy({
      settings: { ...DEFAULT_AI_ACCESS_SETTINGS, ai_access_enabled: false },
      accessMode: "write_enabled",
      method: "GET",
    });
    expect(denial?.code).toBe("AI_ACCESS_DISABLED");
  });

  it("denies writes when user write flag is off", () => {
    const denial = evaluateApiKeyRequestPolicy({
      settings: {
        ...DEFAULT_AI_ACCESS_SETTINGS,
        ai_access_enabled: true,
        ai_write_access_enabled: false,
      },
      accessMode: "write_enabled",
      method: "POST",
    });
    expect(denial?.code).toBe("AI_WRITE_DISABLED");
  });

  it("allows GET when AI access on even if writes are off", () => {
    const denial = evaluateApiKeyRequestPolicy({
      settings: {
        ...DEFAULT_AI_ACCESS_SETTINGS,
        ai_access_enabled: true,
        ai_write_access_enabled: false,
      },
      accessMode: "read_only",
      method: "GET",
    });
    expect(denial).toBeNull();
  });

  it("denies write methods on read_only keys when writes are enabled", () => {
    const denial = evaluateApiKeyRequestPolicy({
      settings: {
        ...DEFAULT_AI_ACCESS_SETTINGS,
        ai_access_enabled: true,
        ai_write_access_enabled: true,
      },
      accessMode: "read_only",
      method: "POST",
    });
    expect(denial?.code).toBe("KEY_ACCESS_MODE_DENIED");
  });

  it("honors operator global write kill switch", () => {
    const denial = evaluateApiKeyRequestPolicy({
      settings: {
        ...DEFAULT_AI_ACCESS_SETTINGS,
        ai_access_enabled: true,
        ai_write_access_enabled: true,
      },
      accessMode: "write_enabled",
      method: "POST",
      globalWriteKillSwitch: true,
    });
    expect(denial?.code).toBe("MCP_WRITE_TEMPORARILY_DISABLED");
    expect(denial?.statusCode).toBe(503);
  });
});
