/**
 * Seeds the database with demo sites and ~30 days of synthetic history so the
 * dashboard can be explored without a PageSpeed Insights API key.
 *
 *   npm run db:seed
 */
import "./load-env";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const DAY = 24 * 60 * 60 * 1000;
const DAYS = 30;

// Deterministic PRNG so the demo looks the same on every machine.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Profile {
  name: string;
  url: string;
  lcp: number;
  inp: number;
  cls: number;
  tbt: number;
  /** Multiplier applied to the final snapshot to simulate a regression. */
  regressOnLastDay?: number;
}

const DEMO_SITES: Profile[] = [
  { name: "Marketing site", url: "https://www.example.com/", lcp: 1900, inp: 120, cls: 0.03, tbt: 90 },
  { name: "Web store", url: "https://shop.example.com/", lcp: 2300, inp: 180, cls: 0.06, tbt: 180, regressOnLastDay: 1.9 },
  { name: "Docs", url: "https://docs.example.com/", lcp: 1500, inp: 90, cls: 0.01, tbt: 60 },
  { name: "Customer portal", url: "https://app.example.com/", lcp: 3600, inp: 320, cls: 0.14, tbt: 520 },
];

async function main() {
  const db = getDb();
  const rand = mulberry32(42);
  const jitter = (value: number, spread = 0.12) => value * (1 + (rand() * 2 - 1) * spread);
  const now = Date.now();

  for (const profile of DEMO_SITES) {
    const existing = db.select().from(schema.sites).where(eq(schema.sites.url, profile.url)).get();
    if (existing) {
      console.log(`• ${profile.url} already exists, skipping`);
      continue;
    }
    const site = db.insert(schema.sites).values({ name: profile.name, url: profile.url }).returning().get();

    for (const strategy of ["mobile", "desktop"] as const) {
      const factor = strategy === "mobile" ? 1 : 0.55;
      const rows = Array.from({ length: DAYS }, (_, i) => {
        const isLast = i === DAYS - 1;
        // Gentle improvement over the month plus a weekly wobble.
        const drift = (1 - i * 0.004) * (1 + Math.sin(i / 1.1) * 0.03);
        const regress = isLast && profile.regressOnLastDay ? profile.regressOnLastDay : 1;
        const m = factor * drift * regress;
        // Only loading metrics regress, so the demo shows a focused incident.
        const labLcp = jitter(profile.lcp * m * 1.1, 0.04);
        const labTbt = jitter(profile.tbt * m, 0.06);
        const labCls = Math.max(0, jitter(profile.cls, 0.05));
        // Rough approximation of Lighthouse's log-normal scoring curves.
        const performanceScore =
          100 * Math.exp(-(0.2 * (labLcp / 2500) ** 2 + 0.3 * (labTbt / 600) + labCls));
        return {
          siteId: site.id,
          strategy,
          fetchedAt: new Date(now - (DAYS - 1 - i) * DAY),
          performanceScore: Math.round(performanceScore),
          accessibilityScore: Math.round(jitter(92, 0.04)),
          bestPracticesScore: Math.round(Math.min(100, jitter(96, 0.04))),
          seoScore: Math.round(Math.min(100, jitter(95, 0.04))),
          fieldSource: "url" as const,
          fieldLcp: Math.round(jitter(profile.lcp * m, 0.05)),
          fieldInp: Math.round(jitter(profile.inp * (strategy === "mobile" ? 1 : 0.6), 0.05)),
          fieldCls: Number(jitter(profile.cls, 0.08).toFixed(2)),
          fieldFcp: Math.round(jitter(profile.lcp * m * 0.6, 0.05)),
          fieldTtfb: Math.round(jitter(profile.lcp * m * 0.25, 0.08)),
          labLcp,
          labCls,
          labTbt,
          labFcp: jitter(profile.lcp * m * 0.55),
          labSpeedIndex: jitter(profile.lcp * m * 1.3),
          labTtfb: jitter(profile.lcp * m * 0.15),
        };
      });
      db.insert(schema.snapshots).values(rows).run();
    }
    console.log(`✓ Seeded ${profile.name} (${profile.url})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
