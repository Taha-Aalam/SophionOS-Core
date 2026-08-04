import { describe, expect, it } from "vitest";

import { releaseHeader, withReleaseMeta } from "@/lib/watermark/envelope";
import { RELEASE_TAG } from "@/lib/watermark/release";

describe("withReleaseMeta", () => {
  it("adds meta.ver with the release tag, preserving the body", () => {
    const result = withReleaseMeta({ data: { id: 1 } });
    expect(result).toEqual({ data: { id: 1 }, meta: { ver: RELEASE_TAG } });
  });

  it("overwrites a conflicting meta on the incoming body", () => {
    const result = withReleaseMeta({ meta: { nope: true } });
    expect(result.meta).toEqual({ ver: RELEASE_TAG });
  });
});

describe("releaseHeader", () => {
  it("returns the release tag for use as a response header value", () => {
    expect(releaseHeader()).toBe(RELEASE_TAG);
  });
});

import { error, success } from "@/lib/api/api-response";
import { AppError } from "@/lib/api/error-handler";

describe("api-response envelope integration", () => {
  it("success() includes meta.ver in the JSON body", async () => {
    const res = success({ hello: "world" });
    const body = await res.json();
    expect(body).toMatchObject({ data: { hello: "world" }, meta: { ver: RELEASE_TAG } });
  });

  it("error() sets the X-Sophonios-Release header", () => {
    const res = error(new AppError("boom", 500));
    expect(res.headers.get("X-Sophonios-Release")).toBe(RELEASE_TAG);
  });
});
