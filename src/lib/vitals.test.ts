import { describe, expect, it } from "vitest";
import { assessCoreWebVitals, formatMetric, rate } from "./vitals";

describe("rate", () => {
  it("buckets lower-is-better metrics using inclusive thresholds", () => {
    expect(rate("fieldLcp", 2500)).toBe("good");
    expect(rate("fieldLcp", 2501)).toBe("needs-improvement");
    expect(rate("fieldLcp", 4000)).toBe("needs-improvement");
    expect(rate("fieldLcp", 4001)).toBe("poor");
    expect(rate("fieldCls", 0.1)).toBe("good");
    expect(rate("fieldInp", 600)).toBe("poor");
  });

  it("buckets higher-is-better scores", () => {
    expect(rate("performanceScore", 90)).toBe("good");
    expect(rate("performanceScore", 50)).toBe("needs-improvement");
    expect(rate("performanceScore", 49)).toBe("poor");
  });

  it("returns null for missing values", () => {
    expect(rate("fieldInp", null)).toBeNull();
    expect(rate("fieldInp", undefined)).toBeNull();
  });
});

describe("formatMetric", () => {
  it("formats by unit", () => {
    expect(formatMetric("fieldLcp", 2430)).toBe("2.4 s");
    expect(formatMetric("fieldInp", 182.4)).toBe("182 ms");
    expect(formatMetric("fieldCls", 0.054)).toBe("0.05");
    expect(formatMetric("performanceScore", 87.6)).toBe("88");
    expect(formatMetric("labTbt", null)).toBe("—");
  });
});

describe("assessCoreWebVitals", () => {
  it("passes only when every available core vital is good", () => {
    expect(assessCoreWebVitals({ fieldLcp: 2000, fieldInp: 150, fieldCls: 0.05 })).toBe("passed");
    expect(assessCoreWebVitals({ fieldLcp: 2000, fieldInp: 250, fieldCls: 0.05 })).toBe("failed");
  });

  it("tolerates missing INP", () => {
    expect(assessCoreWebVitals({ fieldLcp: 2000, fieldInp: null, fieldCls: 0.05 })).toBe("passed");
  });

  it("reports no-data without field LCP/CLS", () => {
    expect(assessCoreWebVitals(null)).toBe("no-data");
    expect(assessCoreWebVitals({ fieldLcp: null, fieldInp: 100, fieldCls: null })).toBe("no-data");
  });
});
