import { and, desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { getDb, schema } from "@/db";
import type { Site, Snapshot, Strategy } from "@/db/schema";
import { detectRegressions, type Regression } from "@/lib/regressions";
import { siteSlug } from "@/lib/sites";
import { assessCoreWebVitals, type CwvAssessment } from "@/lib/vitals";

const HISTORY_LIMIT = 60;

export interface SiteOverview {
  site: Site;
  latest: Snapshot | null;
  history: Snapshot[];
  assessment: CwvAssessment;
  regressions: Regression[];
}

function getHistory(siteId: number, strategy: Strategy, limit = HISTORY_LIMIT): Snapshot[] {
  return getDb()
    .select()
    .from(schema.snapshots)
    .where(and(eq(schema.snapshots.siteId, siteId), eq(schema.snapshots.strategy, strategy)))
    .orderBy(desc(schema.snapshots.fetchedAt))
    .limit(limit)
    .all()
    .reverse();
}

function buildOverview(site: Site, strategy: Strategy): SiteOverview {
  const history = getHistory(site.id, strategy);
  const latest = history.at(-1) ?? null;
  return {
    site,
    latest,
    history,
    assessment: assessCoreWebVitals(latest),
    regressions: detectRegressions(history),
  };
}

export async function getDashboard(strategy: Strategy): Promise<SiteOverview[]> {
  // better-sqlite3 is synchronous: opt out of prerendering explicitly.
  await connection();
  const sites = getDb().select().from(schema.sites).orderBy(schema.sites.name).all();
  return sites.map((site) => buildOverview(site, strategy));
}

export async function getSiteOverview(siteId: number, strategy: Strategy): Promise<SiteOverview | null> {
  await connection();
  const site = getDb().select().from(schema.sites).where(eq(schema.sites.id, siteId)).get();
  return site ? buildOverview(site, strategy) : null;
}

export async function getSiteOverviewBySlug(slug: string, strategy: Strategy): Promise<SiteOverview | null> {
  await connection();
  const normalized = slug.trim().toLowerCase();
  const site = getDb().select().from(schema.sites).all().find((candidate) => siteSlug(candidate.url) === normalized);
  return site ? buildOverview(site, strategy) : null;
}
