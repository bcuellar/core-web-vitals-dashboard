import type { Snapshot } from "@/db/schema";

export type Rating = "good" | "needs-improvement" | "poor";

export type MetricKey =
  | "performanceScore"
  | "fieldLcp"
  | "fieldInp"
  | "fieldCls"
  | "fieldFcp"
  | "fieldTtfb"
  | "labLcp"
  | "labCls"
  | "labTbt"
  | "labFcp"
  | "labSpeedIndex"
  | "labTtfb";

export interface MetricDef {
  key: MetricKey;
  label: string;
  name: string;
  source: "field" | "lab" | "score";
  unit: "ms" | "unitless" | "score";
  /** Boundary of the "good" bucket (inclusive). */
  good: number;
  /** Boundary of the "poor" bucket (exclusive for lower-is-better metrics). */
  poor: number;
  higherIsBetter: boolean;
  /** Smallest absolute change considered meaningful (filters out noise). */
  minDelta: number;
}

const def = (d: MetricDef) => d;

// Thresholds follow https://web.dev/articles/vitals and Lighthouse scoring guidance.
export const METRICS: Record<MetricKey, MetricDef> = {
  performanceScore: def({ key: "performanceScore", label: "Perf", name: "Performance score", source: "score", unit: "score", good: 90, poor: 50, higherIsBetter: true, minDelta: 5 }),
  fieldLcp: def({ key: "fieldLcp", label: "LCP", name: "Largest Contentful Paint", source: "field", unit: "ms", good: 2500, poor: 4000, higherIsBetter: false, minDelta: 100 }),
  fieldInp: def({ key: "fieldInp", label: "INP", name: "Interaction to Next Paint", source: "field", unit: "ms", good: 200, poor: 500, higherIsBetter: false, minDelta: 20 }),
  fieldCls: def({ key: "fieldCls", label: "CLS", name: "Cumulative Layout Shift", source: "field", unit: "unitless", good: 0.1, poor: 0.25, higherIsBetter: false, minDelta: 0.01 }),
  fieldFcp: def({ key: "fieldFcp", label: "FCP", name: "First Contentful Paint", source: "field", unit: "ms", good: 1800, poor: 3000, higherIsBetter: false, minDelta: 100 }),
  fieldTtfb: def({ key: "fieldTtfb", label: "TTFB", name: "Time to First Byte", source: "field", unit: "ms", good: 800, poor: 1800, higherIsBetter: false, minDelta: 50 }),
  labLcp: def({ key: "labLcp", label: "LCP (lab)", name: "Largest Contentful Paint (lab)", source: "lab", unit: "ms", good: 2500, poor: 4000, higherIsBetter: false, minDelta: 200 }),
  labCls: def({ key: "labCls", label: "CLS (lab)", name: "Cumulative Layout Shift (lab)", source: "lab", unit: "unitless", good: 0.1, poor: 0.25, higherIsBetter: false, minDelta: 0.01 }),
  labTbt: def({ key: "labTbt", label: "TBT", name: "Total Blocking Time", source: "lab", unit: "ms", good: 200, poor: 600, higherIsBetter: false, minDelta: 50 }),
  labFcp: def({ key: "labFcp", label: "FCP (lab)", name: "First Contentful Paint (lab)", source: "lab", unit: "ms", good: 1800, poor: 3000, higherIsBetter: false, minDelta: 200 }),
  labSpeedIndex: def({ key: "labSpeedIndex", label: "SI", name: "Speed Index", source: "lab", unit: "ms", good: 3400, poor: 5800, higherIsBetter: false, minDelta: 200 }),
  labTtfb: def({ key: "labTtfb", label: "TTFB (lab)", name: "Server response time (lab)", source: "lab", unit: "ms", good: 800, poor: 1800, higherIsBetter: false, minDelta: 50 }),
};

export const CORE_WEB_VITALS = ["fieldLcp", "fieldInp", "fieldCls"] as const satisfies readonly MetricKey[];

export function rate(metric: MetricKey, value: number | null | undefined): Rating | null {
  if (value == null || Number.isNaN(value)) return null;
  const { good, poor, higherIsBetter } = METRICS[metric];
  if (higherIsBetter) {
    if (value >= good) return "good";
    if (value >= poor) return "needs-improvement";
    return "poor";
  }
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

const RATING_RANK: Record<Rating, number> = { good: 0, "needs-improvement": 1, poor: 2 };

/** Positive when `b` is a worse rating than `a`. */
export function ratingDelta(a: Rating, b: Rating): number {
  return RATING_RANK[b] - RATING_RANK[a];
}

export function formatMetric(metric: MetricKey, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  switch (METRICS[metric].unit) {
    case "score":
      return Math.round(value).toString();
    case "unitless":
      return value.toFixed(2);
    case "ms":
      return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
  }
}

export type CwvAssessment = "passed" | "failed" | "no-data";

/**
 * Mirrors the PageSpeed Insights "Core Web Vitals Assessment": passes when the
 * 75th percentile of LCP, INP and CLS are all "good". INP is optional because
 * low-traffic pages may not report it.
 */
export function assessCoreWebVitals(
  snapshot: Pick<Snapshot, "fieldLcp" | "fieldInp" | "fieldCls"> | null | undefined,
): CwvAssessment {
  if (!snapshot || snapshot.fieldLcp == null || snapshot.fieldCls == null) return "no-data";
  const ratings = CORE_WEB_VITALS.map((key) => rate(key, snapshot[key])).filter(
    (r): r is Rating => r !== null,
  );
  return ratings.every((r) => r === "good") ? "passed" : "failed";
}
