import Link from "next/link";
import { Suspense } from "react";
import { Sparkline, type ChartPoint } from "@/components/charts";
import { AddSiteForm } from "@/components/site-forms";
import { StrategyToggle } from "@/components/strategy-toggle";
import { AssessmentBadge, Card, CardHeader, EmptyState, MetricValue, RegressionItem, Skeleton } from "@/components/ui";
import { formatRelative, hostname } from "@/lib/format";
import { parseStrategy, withStrategy } from "@/lib/strategy";
import type { Strategy } from "@/db/schema";
import { getDashboard, type SiteOverview } from "@/server/queries";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Current Core Web Vitals status, performance trends and regressions across tracked sites.
        </p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
      <Card>
        <CardHeader title="Track a new site" description="Snapshots are collected for both mobile and desktop." />
        <AddSiteForm />
      </Card>
    </div>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const strategy = parseStrategy((await searchParams).strategy);
  const overviews = await getDashboard(strategy);
  const now = new Date();

  const withData = overviews.filter((o) => o.assessment !== "no-data");
  const passing = withData.filter((o) => o.assessment === "passed").length;
  const regressions = overviews.flatMap((o) => o.regressions.map((r) => ({ ...r, site: o.site })));
  const highSeverity = regressions.filter((r) => r.severity === "high").length;
  const lastCollected = overviews
    .map((o) => o.latest?.fetchedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sites tracked" value={overviews.length} />
        <Stat
          label="Passing Core Web Vitals"
          value={withData.length ? `${passing}/${withData.length}` : "—"}
          hint={withData.length ? `${Math.round((passing / withData.length) * 100)}% of sites with field data` : "No field data yet"}
        />
        <Stat
          label="Active regressions"
          value={regressions.length}
          hint={regressions.length ? `${highSeverity} high severity` : "All clear"}
          tone={highSeverity ? "bad" : regressions.length ? "warn" : "good"}
        />
        <Stat label="Last collected" value={lastCollected ? formatRelative(lastCollected, now) : "Never"} />
      </div>

      <Card>
        <CardHeader
          title="Sites"
          description="Field metrics are 75th percentile from the Chrome UX Report."
          action={<StrategyToggle current={strategy} basePath="/" />}
        />
        {overviews.length === 0 ? (
          <EmptyState title="No sites tracked yet">
            Add a site below, or run <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run db:seed</code> to
            load demo data.
          </EmptyState>
        ) : (
          <SitesTable overviews={overviews} strategy={strategy} now={now} />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Regressions"
          description="Latest snapshot compared with the median of the previous 7 for this strategy."
        />
        {regressions.length === 0 ? (
          <EmptyState title="No regressions detected">Metrics are within 10% of their recent baseline.</EmptyState>
        ) : (
          <div className="divide-y divide-slate-100 px-5">
            {regressions
              .sort((a, b) => (a.severity === b.severity ? b.deltaPercent - a.deltaPercent : a.severity === "high" ? -1 : 1))
              .map((r) => (
                <RegressionItem
                  key={`${r.site.id}-${r.metric}`}
                  regression={r}
                  siteLabel={
                    <Link
                      href={withStrategy(`/sites/${r.site.id}`, strategy)}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      {r.site.name}
                    </Link>
                  }
                />
              ))}
          </div>
        )}
      </Card>
    </>
  );
}

function SitesTable({ overviews, strategy, now }: { overviews: SiteOverview[]; strategy: Strategy; now: Date }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
            <th className="px-5 py-3">Site</th>
            <th className="px-3 py-3">CWV</th>
            <th className="px-3 py-3">LCP</th>
            <th className="px-3 py-3">INP</th>
            <th className="px-3 py-3">CLS</th>
            <th className="px-3 py-3">Perf</th>
            <th className="px-3 py-3">Perf trend</th>
            <th className="px-5 py-3 text-right">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {overviews.map(({ site, latest, history, assessment, regressions }) => {
            const points: ChartPoint[] = history.map((s) => ({ t: s.fetchedAt.getTime(), performanceScore: s.performanceScore }));
            const href = withStrategy(`/sites/${site.id}`, strategy);
            return (
              <tr key={site.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <Link href={href} className="font-medium text-slate-900 hover:text-indigo-600">
                    {site.name}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {hostname(site.url)}
                    {regressions.length > 0 && (
                      <span className="text-rose-600">
                        {regressions.length} regression{regressions.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <AssessmentBadge assessment={assessment} />
                </td>
                <td className="px-3 py-3"><MetricValue metric="fieldLcp" value={latest?.fieldLcp} /></td>
                <td className="px-3 py-3"><MetricValue metric="fieldInp" value={latest?.fieldInp} /></td>
                <td className="px-3 py-3"><MetricValue metric="fieldCls" value={latest?.fieldCls} /></td>
                <td className="px-3 py-3"><MetricValue metric="performanceScore" value={latest?.performanceScore} /></td>
                <td className="px-3 py-3"><Sparkline points={points} metric="performanceScore" /></td>
                <td className="px-5 py-3 text-right text-xs whitespace-nowrap text-slate-500">
                  {latest ? formatRelative(latest.fetchedAt, now) : "Never"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const toneClass = tone === "bad" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-slate-500";
  return (
    <Card className="p-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className={`mt-1 text-xs ${toneClass}`}>{hint}</p>}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </>
  );
}
