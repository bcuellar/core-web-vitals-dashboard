import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TrendChart, type ChartPoint } from "@/components/charts";
import { CollectButton, DeleteSiteButton } from "@/components/site-forms";
import { StrategyToggle } from "@/components/strategy-toggle";
import { AssessmentBadge, Card, CardHeader, EmptyState, MetricValue, RegressionItem, Skeleton } from "@/components/ui";
import type { Snapshot } from "@/db/schema";
import { formatDateTime, formatRelative } from "@/lib/format";
import { parseStrategy } from "@/lib/strategy";
import { METRICS, type MetricKey } from "@/lib/vitals";
import { getSiteOverview } from "@/server/queries";

export const metadata: Metadata = { title: "Site" };

const FIELD_VS_LAB = "Field p75 (solid) vs. lab (dashed)";
const CHARTS: { title: string; description: string; series: MetricKey[] }[] = [
  { title: "Performance score", description: "Lighthouse", series: ["performanceScore"] },
  { title: "Largest Contentful Paint", description: FIELD_VS_LAB, series: ["fieldLcp", "labLcp"] },
  { title: "Interaction to Next Paint", description: "Field p75", series: ["fieldInp"] },
  { title: "Cumulative Layout Shift", description: FIELD_VS_LAB, series: ["fieldCls", "labCls"] },
  { title: "Total Blocking Time", description: "Lab", series: ["labTbt"] },
  { title: "Time to First Byte", description: FIELD_VS_LAB, series: ["fieldTtfb", "labTtfb"] },
];

const HISTORY_COLUMNS: MetricKey[] = ["performanceScore", "fieldLcp", "fieldInp", "fieldCls", "labLcp", "labTbt", "labCls"];

const FIELD_METRICS: MetricKey[] = ["fieldLcp", "fieldInp", "fieldCls", "fieldFcp", "fieldTtfb"];
const SCORES = [
  { key: "performanceScore", label: "Performance" },
  { key: "accessibilityScore", label: "Accessibility" },
  { key: "bestPracticesScore", label: "Best practices" },
  { key: "seoScore", label: "SEO" },
] as const;

export default function SitePage({ params, searchParams }: PageProps<"/sites/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← All sites
      </Link>
      <Suspense fallback={<SiteSkeleton />}>
        <SiteDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SiteDetail({ params, searchParams }: PageProps<"/sites/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const strategy = parseStrategy((await searchParams).strategy);
  const overview = await getSiteOverview(id, strategy);
  if (!overview) notFound();

  const { site, latest, history, assessment, regressions } = overview;
  const points: ChartPoint[] = history.map((s) => ({ ...pick(s), t: s.fetchedAt.getTime() }));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-indigo-600 hover:text-indigo-500"
          >
            {site.url} ↗
          </a>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <StrategyToggle current={strategy} basePath={`/sites/${site.id}`} />
          <CollectButton siteId={site.id} />
          <DeleteSiteButton siteId={site.id} siteName={site.name} />
        </div>
      </div>

      {!latest ? (
        <Card>
          <EmptyState title={`No ${strategy} snapshots yet`}>
            Click “Run check now” or run <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">npm run collect</code>{" "}
            to fetch PageSpeed Insights data.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">Core Web Vitals assessment</h2>
                  <AssessmentBadge assessment={assessment} />
                </div>
                <p className="text-xs text-slate-500">
                  {latest.fieldSource === "origin" ? "Origin-level field data" : latest.fieldSource === "url" ? "URL-level field data" : "No CrUX data"}
                  {" · "}
                  updated {formatRelative(latest.fetchedAt)}
                </p>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {FIELD_METRICS.map((key) => (
                  <div key={key}>
                    <dt className="text-xs text-slate-500" title={METRICS[key].name}>
                      {METRICS[key].label}
                    </dt>
                    <dd className="mt-1 text-lg">
                      <MetricValue metric={key} value={latest[key]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-5">
              <h2 className="text-sm font-semibold">Lighthouse scores</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                {SCORES.map(({ key, label }) => (
                  <div key={key}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="mt-1 text-lg">
                      <MetricValue metric="performanceScore" value={latest[key]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          {regressions.length > 0 && (
            <Card>
              <CardHeader title="Regressions" description="Latest snapshot vs. median of the previous 7." />
              <div className="divide-y divide-slate-100 px-5">
                {regressions.map((r) => (
                  <RegressionItem key={r.metric} regression={r} />
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {CHARTS.map(({ title, description, series }) => (
              <Card key={title}>
                <CardHeader title={title} description={description} />
                <div className="px-2 py-4">
                  <TrendChart points={points} series={series} />
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader title="Snapshot history" description={`Most recent ${Math.min(history.length, 20)} of ${history.length} ${strategy} snapshots`} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    <th className="px-5 py-3">Collected</th>
                    {HISTORY_COLUMNS.map((key) => (
                      <th key={key} className="px-3 py-3" title={METRICS[key].name}>
                        {METRICS[key].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history
                    .slice(-20)
                    .reverse()
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(s.fetchedAt)}</td>
                        {HISTORY_COLUMNS.map((key) => (
                          <td key={key} className="px-3 py-2.5">
                            <MetricValue metric={key} value={s[key]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function pick(s: Snapshot): Omit<ChartPoint, "t"> {
  const out: Omit<ChartPoint, "t"> = {};
  for (const key of Object.keys(METRICS) as MetricKey[]) out[key] = s[key];
  return out;
}

function SiteSkeleton() {
  return (
    <>
      <Skeleton className="h-14 w-1/2" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-36 lg:col-span-2" />
        <Skeleton className="h-36" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </>
  );
}
