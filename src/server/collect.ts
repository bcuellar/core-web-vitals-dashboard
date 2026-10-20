import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { STRATEGIES, type Site, type Strategy } from "@/db/schema";
import { getEnv } from "@/lib/env";
import { runPageSpeed } from "@/lib/psi";

export interface CollectResult {
  siteId: number;
  url: string;
  strategy: Strategy;
  ok: boolean;
  error?: string;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Runs PageSpeed Insights for every (site, strategy) pair and stores a
 * snapshot for each successful run. Failures are reported, not thrown.
 */
export async function collectSnapshots(
  options: { siteId?: number; strategies?: readonly Strategy[] } = {},
): Promise<CollectResult[]> {
  const db = getDb();
  const env = getEnv();
  const strategies = options.strategies ?? STRATEGIES;

  const targets: Site[] =
    options.siteId === undefined
      ? db.select().from(schema.sites).all()
      : db.select().from(schema.sites).where(eq(schema.sites.id, options.siteId)).all();

  const jobs = targets.flatMap((site) => strategies.map((strategy) => ({ site, strategy })));

  return mapWithConcurrency(jobs, env.COLLECT_CONCURRENCY, async ({ site, strategy }) => {
    const result = { siteId: site.id, url: site.url, strategy };
    let snapshot;
    try {
      snapshot = await runPageSpeed(site.url, strategy, { apiKey: env.PSI_API_KEY });
    } catch (error) {
      return { ...result, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    try {
      db.insert(schema.snapshots).values({ ...snapshot, siteId: site.id }).run();
    } catch (error) {
      // Most likely the site was removed while its PSI request was in flight.
      const detail = error instanceof Error ? error.message : String(error);
      return { ...result, ok: false, error: `Could not save snapshot: ${detail}` };
    }
    return { ...result, ok: true };
  });
}
