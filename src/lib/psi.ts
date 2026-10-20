import type { NewSnapshot, Strategy } from "@/db/schema";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;

interface CruxMetric {
  percentile?: number;
}

interface CruxExperience {
  id?: string;
  origin_fallback?: boolean;
  metrics?: Record<string, CruxMetric | undefined>;
}

interface LighthouseAudit {
  numericValue?: number;
}

/** The subset of the PSI v5 response this app relies on. */
export interface PsiResponse {
  loadingExperience?: CruxExperience;
  originLoadingExperience?: CruxExperience;
  analysisUTCTimestamp?: string;
  lighthouseResult?: {
    fetchTime?: string;
    categories?: Partial<Record<(typeof CATEGORIES)[number], { score?: number | null }>>;
    audits?: Record<string, LighthouseAudit | undefined>;
  };
}

export type ParsedSnapshot = Omit<NewSnapshot, "id" | "siteId">;

const score = (value: number | null | undefined) =>
  value == null ? null : Math.round(value * 100);

const auditValue = (res: PsiResponse, id: string) =>
  res.lighthouseResult?.audits?.[id]?.numericValue ?? null;

function pickFieldData(res: PsiResponse): { source: "url" | "origin"; experience: CruxExperience } | null {
  const page = res.loadingExperience;
  if (page?.metrics && Object.keys(page.metrics).length > 0) {
    return { source: page.origin_fallback ? "origin" : "url", experience: page };
  }
  const origin = res.originLoadingExperience;
  if (origin?.metrics && Object.keys(origin.metrics).length > 0) {
    return { source: "origin", experience: origin };
  }
  return null;
}

/** Normalises a PageSpeed Insights API response into a snapshot row. */
export function parsePsiResponse(res: PsiResponse, strategy: Strategy, now = new Date()): ParsedSnapshot {
  const field = pickFieldData(res);
  const crux = (key: string) => field?.experience.metrics?.[key]?.percentile ?? null;
  const cruxCls = crux("CUMULATIVE_LAYOUT_SHIFT_SCORE");
  const categories = res.lighthouseResult?.categories;
  const timestamp = res.lighthouseResult?.fetchTime ?? res.analysisUTCTimestamp;
  const fetchedAt = timestamp ? new Date(timestamp) : now;

  return {
    strategy,
    fetchedAt: Number.isNaN(fetchedAt.getTime()) ? now : fetchedAt,
    performanceScore: score(categories?.performance?.score),
    accessibilityScore: score(categories?.accessibility?.score),
    bestPracticesScore: score(categories?.["best-practices"]?.score),
    seoScore: score(categories?.seo?.score),
    fieldSource: field?.source ?? null,
    fieldLcp: crux("LARGEST_CONTENTFUL_PAINT_MS"),
    fieldInp: crux("INTERACTION_TO_NEXT_PAINT"),
    // CrUX reports CLS percentiles multiplied by 100.
    fieldCls: cruxCls == null ? null : cruxCls / 100,
    fieldFcp: crux("FIRST_CONTENTFUL_PAINT_MS"),
    fieldTtfb: crux("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
    labLcp: auditValue(res, "largest-contentful-paint"),
    labCls: auditValue(res, "cumulative-layout-shift"),
    labTbt: auditValue(res, "total-blocking-time"),
    labFcp: auditValue(res, "first-contentful-paint"),
    labSpeedIndex: auditValue(res, "speed-index"),
    labTtfb: auditValue(res, "server-response-time"),
  };
}

export function buildPsiUrl(url: string, strategy: Strategy, apiKey?: string): string {
  const params = new URLSearchParams({ url, strategy });
  for (const category of CATEGORIES) params.append("category", category);
  if (apiKey) params.set("key", apiKey);
  return `${PSI_ENDPOINT}?${params.toString()}`;
}

export class PsiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PsiError";
  }
}

export async function runPageSpeed(
  url: string,
  strategy: Strategy,
  options: { apiKey?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<ParsedSnapshot> {
  const { apiKey, timeoutMs = 120_000, fetchImpl = fetch } = options;
  let response: Response;
  try {
    response = await fetchImpl(buildPsiUrl(url, strategy, apiKey), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: "application/json" },
    });
  } catch (error) {
    const cause = error instanceof Error ? ((error.cause as Error | undefined)?.message ?? error.message) : String(error);
    throw new PsiError(`Could not reach PageSpeed Insights: ${cause}`);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      // ignore malformed error bodies
    }
    throw new PsiError(`PageSpeed Insights request failed (${response.status}): ${detail}`, response.status);
  }

  return parsePsiResponse((await response.json()) as PsiResponse, strategy);
}
