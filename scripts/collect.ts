/**
 * Collects a fresh PageSpeed Insights snapshot for every tracked site.
 *
 *   npm run collect                  # all sites, mobile + desktop
 *   npm run collect -- --site 3      # a single site
 *   npm run collect -- --strategy mobile
 */
import { loadEnvConfig } from "@next/env";
import { parseArgs } from "node:util";
import { STRATEGIES, type Strategy } from "@/db/schema";
import { collectSnapshots } from "@/server/collect";

loadEnvConfig(process.cwd());

async function main() {
  const { values } = parseArgs({
    options: { site: { type: "string" }, strategy: { type: "string" } },
  });

  const strategy = values.strategy as Strategy | undefined;
  if (strategy && !STRATEGIES.includes(strategy)) {
    throw new Error(`--strategy must be one of: ${STRATEGIES.join(", ")}`);
  }
  const siteId = values.site ? Number(values.site) : undefined;
  if (siteId !== undefined && !Number.isInteger(siteId)) throw new Error("--site must be a numeric site id");

  const results = await collectSnapshots({ siteId, strategies: strategy ? [strategy] : undefined });
  if (results.length === 0) console.log("No sites to collect. Add one in the UI or run `npm run db:seed`.");
  for (const r of results) {
    console.log(`${r.ok ? "✓" : "✗"} [${r.strategy}] ${r.url}${r.error ? ` — ${r.error}` : ""}`);
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
