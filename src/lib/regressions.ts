import type { Snapshot } from "@/db/schema";
import { METRICS, rate, ratingDelta, type MetricKey, type Rating } from "./vitals";

export const REGRESSION_METRICS = [
  "performanceScore",
  "fieldLcp",
  "fieldInp",
  "fieldCls",
  "labLcp",
  "labTbt",
  "labCls",
] as const satisfies readonly MetricKey[];

export interface Regression {
  metric: MetricKey;
  baseline: number;
  current: number;
  /** Signed change, positive means worse. */
  delta: number;
  /** Relative change in percent, positive means worse. */
  deltaPercent: number;
  baselineRating: Rating | null;
  currentRating: Rating | null;
  severity: "high" | "medium";
}

export interface RegressionOptions {
  /** How many prior snapshots form the baseline (median). */
  baselineWindow?: number;
  /** Minimum relative worsening, in percent, to count as a regression. */
  thresholdPercent?: number;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compares the most recent snapshot against the median of the preceding
 * `baselineWindow` snapshots. A metric regresses when it worsened by both the
 * relative threshold and the metric's minimum absolute delta. Regressions that
 * also drop into a worse rating bucket are flagged as high severity.
 *
 * @param history snapshots for a single site + strategy, oldest first.
 */
export function detectRegressions(
  history: Pick<Snapshot, MetricKey>[],
  { baselineWindow = 7, thresholdPercent = 10 }: RegressionOptions = {},
): Regression[] {
  if (history.length < 2) return [];
  const latest = history[history.length - 1];
  const previous = history.slice(Math.max(0, history.length - 1 - baselineWindow), -1);
  const regressions: Regression[] = [];

  for (const metric of REGRESSION_METRICS) {
    const current = latest[metric];
    const values = previous.map((s) => s[metric]).filter((v): v is number => v != null);
    if (current == null || values.length === 0) continue;

    const def = METRICS[metric];
    const baseline = median(values);
    const delta = def.higherIsBetter ? baseline - current : current - baseline;
    const deltaPercent = baseline === 0 ? (delta > 0 ? Infinity : 0) : (delta / Math.abs(baseline)) * 100;

    if (delta < def.minDelta || deltaPercent < thresholdPercent) continue;

    const baselineRating = rate(metric, baseline);
    const currentRating = rate(metric, current);
    const worseBucket =
      baselineRating && currentRating ? ratingDelta(baselineRating, currentRating) > 0 : false;

    regressions.push({
      metric,
      baseline,
      current,
      delta,
      deltaPercent,
      baselineRating,
      currentRating,
      severity: worseBucket ? "high" : "medium",
    });
  }

  return regressions;
}
