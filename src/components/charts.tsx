"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMetric, METRICS, type MetricKey } from "@/lib/vitals";

export type ChartPoint = { t: number } & Partial<Record<MetricKey, number | null>>;

const dateTick = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const SERIES_COLORS = ["#4f46e5", "#94a3b8"];

export function Sparkline({ points, metric }: { points: ChartPoint[]; metric: MetricKey }) {
  if (points.filter((p) => p[metric] != null).length < 2) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="h-8 w-28" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey={metric} stroke="#4f46e5" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Line chart for one metric (optionally field + lab series) with shaded
 * good / needs-improvement / poor bands.
 */
export function TrendChart({ points, series }: { points: ChartPoint[]; series: MetricKey[] }) {
  const primary = METRICS[series[0]];
  const values = points.flatMap((p) => series.map((s) => p[s])).filter((v): v is number => v != null);
  // Cap the axis so a single extreme outlier doesn't flatten the chart.
  const highest = values.reduce((acc, v) => Math.max(acc, v), 0);
  const max = primary.higherIsBetter ? 100 : Math.min(Math.max(primary.poor * 1.15, highest), primary.poor * 3) * 1.05;
  const min = 0;
  const bands = primary.higherIsBetter
    ? [
        { y1: primary.good, y2: max, fill: "#10b981" },
        { y1: primary.poor, y2: primary.good, fill: "#f59e0b" },
        { y1: min, y2: primary.poor, fill: "#f43f5e" },
      ]
    : [
        { y1: min, y2: primary.good, fill: "#10b981" },
        { y1: primary.good, y2: primary.poor, fill: "#f59e0b" },
        { y1: primary.poor, y2: max, fill: "#f43f5e" },
      ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          {bands.map((b) => (
            <ReferenceArea key={b.fill} y1={b.y1} y2={b.y2} fill={b.fill} fillOpacity={0.06} ifOverflow="hidden" />
          ))}
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={dateTick}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[min, max]}
            tickFormatter={(v: number) => formatMetric(series[0], v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDataOverflow
          />
          <Tooltip
            labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            formatter={(value, name) => {
              const key = series.find((s) => s === name) ?? series[0];
              return [formatMetric(key, typeof value === "number" ? value : null), METRICS[key].label];
            }}
            contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }}
          />
          {series.length > 1 && (
            <Legend
              formatter={(name: string) => METRICS[name as MetricKey]?.label ?? name}
              iconType="plainline"
              wrapperStyle={{ fontSize: 12 }}
            />
          )}
          {series.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              strokeDasharray={i > 0 ? "4 3" : undefined}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
