import type { ReactNode } from "react";
import type { Regression } from "@/lib/regressions";
import { formatMetric, METRICS, rate, type CwvAssessment, type MetricKey, type Rating } from "@/lib/vitals";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>
  );
}

export function CardHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const RATING_STYLES: Record<Rating, { text: string; dot: string; pill: string; label: string }> = {
  good: { text: "text-emerald-700", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", label: "Good" },
  "needs-improvement": { text: "text-amber-700", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-800 ring-amber-600/20", label: "Needs improvement" },
  poor: { text: "text-rose-700", dot: "bg-rose-500", pill: "bg-rose-50 text-rose-700 ring-rose-600/20", label: "Poor" },
};

export function ratingStyle(rating: Rating | null) {
  return rating ? RATING_STYLES[rating] : null;
}

export function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", className)}>
      {children}
    </span>
  );
}

export function MetricValue({ metric, value, className }: { metric: MetricKey; value: number | null | undefined; className?: string }) {
  const style = ratingStyle(rate(metric, value));
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium tabular-nums", style?.text ?? "text-slate-400", className)}>
      {style && <span aria-hidden className={cn("size-2 rounded-full", style.dot)} />}
      {formatMetric(metric, value)}
      {style && <span className="sr-only">({style.label})</span>}
    </span>
  );
}

export function AssessmentBadge({ assessment }: { assessment: CwvAssessment }) {
  if (assessment === "passed") return <Pill className={RATING_STYLES.good.pill}>Passed</Pill>;
  if (assessment === "failed") return <Pill className={RATING_STYLES.poor.pill}>Failed</Pill>;
  return <Pill className="bg-slate-50 text-slate-500 ring-slate-500/20">No field data</Pill>;
}

export function RegressionItem({ regression, siteLabel }: { regression: Regression; siteLabel?: ReactNode }) {
  const def = METRICS[regression.metric];
  const change = Number.isFinite(regression.deltaPercent)
    ? `${def.higherIsBetter ? "−" : "+"}${Math.round(regression.deltaPercent)}%`
    : "Up from 0";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {siteLabel && <>{siteLabel} · </>}
          {def.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          <span className="tabular-nums">{formatMetric(regression.metric, regression.baseline)}</span> baseline →{" "}
          <MetricValue metric={regression.metric} value={regression.current} />
        </p>
      </div>
      <Pill className={regression.severity === "high" ? RATING_STYLES.poor.pill : RATING_STYLES["needs-improvement"].pill}>
        {change} · {regression.severity === "high" ? "High" : "Medium"}
      </Pill>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400" aria-hidden>
        ◎
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}
