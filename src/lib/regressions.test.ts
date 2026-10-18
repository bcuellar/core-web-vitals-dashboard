import { describe, expect, it } from "vitest";
import type { Snapshot } from "@/db/schema";
import { detectRegressions, median } from "./regressions";

type Metrics = Partial<Pick<Snapshot, "performanceScore" | "fieldLcp" | "fieldInp" | "fieldCls" | "labLcp" | "labTbt" | "labCls">>;

const snap = (m: Metrics) => ({
  performanceScore: null,
  fieldLcp: null,
  fieldInp: null,
  fieldCls: null,
  fieldFcp: null,
  fieldTtfb: null,
  labLcp: null,
  labCls: null,
  labTbt: null,
  labFcp: null,
  labSpeedIndex: null,
  labTtfb: null,
  ...m,
});

describe("median", () => {
  it("handles odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("detectRegressions", () => {
  it("needs at least two snapshots", () => {
    expect(detectRegressions([])).toEqual([]);
    expect(detectRegressions([snap({ fieldLcp: 9000 })])).toEqual([]);
  });

  it("flags a metric that crosses into a worse rating as high severity", () => {
    const history = [2000, 2100, 2050, 3000].map((fieldLcp) => snap({ fieldLcp }));
    const [regression] = detectRegressions(history);
    expect(regression).toMatchObject({
      metric: "fieldLcp",
      baseline: 2050,
      current: 3000,
      delta: 950,
      baselineRating: "good",
      currentRating: "needs-improvement",
      severity: "high",
    });
  });

  it("flags medium severity when the rating bucket is unchanged", () => {
    const history = [1000, 1000, 1400].map((fieldLcp) => snap({ fieldLcp }));
    expect(detectRegressions(history)).toMatchObject([{ metric: "fieldLcp", severity: "medium" }]);
  });

  it("treats a lower performance score as a regression", () => {
    const history = [95, 94, 96, 70].map((performanceScore) => snap({ performanceScore }));
    expect(detectRegressions(history)).toMatchObject([
      { metric: "performanceScore", baseline: 95, current: 70, delta: 25, severity: "high" },
    ]);
  });

  it("ignores improvements and noise below the thresholds", () => {
    const improving = [3000, 2900, 2000].map((fieldLcp) => snap({ fieldLcp }));
    expect(detectRegressions(improving)).toEqual([]);
    // +60ms is >10% but below LCP's 100ms minimum delta.
    const noisy = [400, 400, 460].map((fieldLcp) => snap({ fieldLcp }));
    expect(detectRegressions(noisy)).toEqual([]);
    // +150ms on 3000ms is above the minimum delta but only 5%.
    const small = [3000, 3000, 3150].map((fieldLcp) => snap({ fieldLcp }));
    expect(detectRegressions(small)).toEqual([]);
  });

  it("only uses the configured baseline window", () => {
    const history = [5000, 5000, 5000, 2000, 2000, 2600].map((fieldLcp) => snap({ fieldLcp }));
    expect(detectRegressions(history, { baselineWindow: 2 })).toMatchObject([
      { metric: "fieldLcp", baseline: 2000 },
    ]);
    expect(detectRegressions(history, { baselineWindow: 5 })).toEqual([]);
  });

  it("skips metrics missing from the latest snapshot or the baseline", () => {
    const history = [snap({ fieldInp: 100 }), snap({ fieldInp: null, labTbt: 900 })];
    expect(detectRegressions(history)).toEqual([]);
  });
});
