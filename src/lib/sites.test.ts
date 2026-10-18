import { describe, expect, it } from "vitest";
import { defaultSiteName, parseSiteId, siteInputSchema } from "./sites";

describe("siteInputSchema", () => {
  it("normalises URLs and adds https:// when missing", () => {
    expect(siteInputSchema.parse({ url: " example.com " }).url).toBe("https://example.com/");
    expect(siteInputSchema.parse({ url: "http://Example.com/pricing" }).url).toBe("http://example.com/pricing");
  });

  it("rejects non-http protocols and garbage", () => {
    expect(siteInputSchema.safeParse({ url: "ftp://example.com" }).success).toBe(false);
    expect(siteInputSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
    expect(siteInputSchema.safeParse({ url: "" }).success).toBe(false);
    expect(siteInputSchema.safeParse({ url: "not a url" }).success).toBe(false);
  });
});

describe("defaultSiteName", () => {
  it("derives a readable name from the URL", () => {
    expect(defaultSiteName("https://www.example.com/")).toBe("example.com");
    expect(defaultSiteName("https://example.com/blog/")).toBe("example.com/blog");
  });
});

describe("parseSiteId", () => {
  it("accepts positive integers only", () => {
    expect(parseSiteId("42")).toBe(42);
    for (const bad of [null, undefined, "", " ", "0", "-1", "1e3", "1.5", "12abc", "abc"]) {
      expect(parseSiteId(bad)).toBeNull();
    }
  });
});
