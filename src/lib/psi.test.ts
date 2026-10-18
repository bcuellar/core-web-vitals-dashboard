import { describe, expect, it, vi } from "vitest";
import { buildPsiUrl, parsePsiResponse, PsiError, runPageSpeed, type PsiResponse } from "./psi";

const fixture: PsiResponse = {
  analysisUTCTimestamp: "2026-01-01T00:00:05.000Z",
  loadingExperience: {
    id: "https://example.com/",
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2200 },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 7 },
      FIRST_CONTENTFUL_PAINT_MS: { percentile: 1300 },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 600 },
    },
  },
  lighthouseResult: {
    fetchTime: "2026-01-01T00:00:00.000Z",
    categories: {
      performance: { score: 0.87 },
      accessibility: { score: 0.95 },
      "best-practices": { score: 1 },
      seo: { score: null },
    },
    audits: {
      "largest-contentful-paint": { numericValue: 2650.5 },
      "cumulative-layout-shift": { numericValue: 0.02 },
      "total-blocking-time": { numericValue: 140 },
      "first-contentful-paint": { numericValue: 1100 },
      "speed-index": { numericValue: 2900 },
      "server-response-time": { numericValue: 320 },
    },
  },
};

describe("parsePsiResponse", () => {
  it("extracts field, lab and score data", () => {
    const parsed = parsePsiResponse(fixture, "mobile");
    expect(parsed).toMatchObject({
      strategy: "mobile",
      performanceScore: 87,
      accessibilityScore: 95,
      bestPracticesScore: 100,
      seoScore: null,
      fieldSource: "url",
      fieldLcp: 2200,
      fieldInp: 180,
      fieldCls: 0.07,
      fieldFcp: 1300,
      fieldTtfb: 600,
      labLcp: 2650.5,
      labCls: 0.02,
      labTbt: 140,
      labFcp: 1100,
      labSpeedIndex: 2900,
      labTtfb: 320,
    });
    expect(parsed.fetchedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("marks origin-level fallback data", () => {
    const parsed = parsePsiResponse(
      { loadingExperience: { ...fixture.loadingExperience, origin_fallback: true } },
      "desktop",
    );
    expect(parsed.fieldSource).toBe("origin");
    expect(parsed.fieldLcp).toBe(2200);
  });

  it("falls back to originLoadingExperience when URL data is missing", () => {
    const parsed = parsePsiResponse(
      { loadingExperience: { metrics: {} }, originLoadingExperience: fixture.loadingExperience },
      "mobile",
    );
    expect(parsed.fieldSource).toBe("origin");
    expect(parsed.fieldInp).toBe(180);
  });

  it("handles responses without field or lab data", () => {
    const now = new Date("2026-02-02T00:00:00.000Z");
    const parsed = parsePsiResponse({}, "mobile", now);
    expect(parsed.fieldSource).toBeNull();
    expect(parsed.fieldLcp).toBeNull();
    expect(parsed.labLcp).toBeNull();
    expect(parsed.performanceScore).toBeNull();
    expect(parsed.fetchedAt).toEqual(now);
  });
});

describe("buildPsiUrl", () => {
  it("includes strategy, all categories and the API key", () => {
    const url = new URL(buildPsiUrl("https://example.com/", "desktop", "secret"));
    expect(url.searchParams.get("url")).toBe("https://example.com/");
    expect(url.searchParams.get("strategy")).toBe("desktop");
    expect(url.searchParams.getAll("category")).toEqual(["performance", "accessibility", "best-practices", "seo"]);
    expect(url.searchParams.get("key")).toBe("secret");
  });

  it("omits the key when not configured", () => {
    expect(new URL(buildPsiUrl("https://example.com/", "mobile")).searchParams.has("key")).toBe(false);
  });
});

describe("runPageSpeed", () => {
  it("parses a successful response", async () => {
    const fetchImpl = vi.fn(async () => Response.json(fixture));
    const parsed = await runPageSpeed("https://example.com/", "mobile", { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(parsed.performanceScore).toBe(87);
  });

  it("surfaces API error messages", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ error: { message: "Quota exceeded" } }, { status: 429 }),
    );
    const error = await runPageSpeed("https://example.com/", "mobile", { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(PsiError);
    expect(error.status).toBe(429);
    expect(error.message).toContain("Quota exceeded");
  });

  it("wraps network failures", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND") });
    });
    const error = await runPageSpeed("https://example.com/", "mobile", { fetchImpl }).catch((e) => e);
    expect(error).toBeInstanceOf(PsiError);
    expect(error.message).toBe("Could not reach PageSpeed Insights: getaddrinfo ENOTFOUND");
  });
});
