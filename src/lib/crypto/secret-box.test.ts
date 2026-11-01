import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box";

const ENV_VAR = "PROVIDER_KEY_ENCRYPTION_SECRET";
const STRONG_SECRET = "unit-test-secret-0123456789abcdef0123456789";

describe("secret-box", () => {
  beforeEach(() => {
    process.env[ENV_VAR] = STRONG_SECRET;
  });
  afterEach(() => {
    process.env[ENV_VAR] = STRONG_SECRET;
  });

  it("roundtrips a secret", () => {
    const payload = encryptSecret("sk-ant-api03-abc123");
    expect(decryptSecret(payload)).toBe("sk-ant-api03-abc123");
  });

  it("emits v1:<iv>:<tag>:<ciphertext> with a 12-byte IV and 16-byte tag", () => {
    const parts = encryptSecret("hello").split(":");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe("v1");
    expect(Buffer.from(parts[1] ?? "", "base64")).toHaveLength(12);
    expect(Buffer.from(parts[2] ?? "", "base64")).toHaveLength(16);
    expect(Buffer.from(parts[3] ?? "", "base64").length).toBeGreaterThan(0);
  });

  it("uses a fresh IV per call", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("throws when the ciphertext is tampered with", () => {
    const [version, iv, tag, ciphertext] = encryptSecret("secret").split(":");
    const bytes = Buffer.from(ciphertext ?? "", "base64");
    bytes[0] = bytes[0]! ^ 0xff;
    const tampered = [version, iv, tag, bytes.toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when decrypting with a different secret", () => {
    const payload = encryptSecret("x");
    process.env[ENV_VAR] = "another-secret-0123456789abcdef0123456789";
    expect(() => decryptSecret(payload)).toThrow();
  });

  it("throws on malformed payloads", () => {
    expect(() => decryptSecret("not-a-payload")).toThrow();
    expect(() => decryptSecret("v1:only:three")).toThrow();
  });

  it("throws when the env var is missing", () => {
    delete process.env[ENV_VAR];
    expect(() => encryptSecret("x")).toThrow(/PROVIDER_KEY_ENCRYPTION_SECRET/);
  });

  it("throws when the env var is shorter than 32 chars", () => {
    process.env[ENV_VAR] = "short";
    expect(() => encryptSecret("x")).toThrow(/32/);
    expect(() => decryptSecret("v1:a:b:c")).toThrow(/32/);
  });
});
