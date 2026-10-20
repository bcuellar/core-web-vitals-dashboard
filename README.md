# web-vitals-observatory

Internal dashboard for tracking **Core Web Vitals** and **PageSpeed Insights** trends across a list of websites.

It periodically runs the [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/about) for each tracked site (mobile and desktop), stores every result as a historical snapshot, and shows:

- **Current status**: Core Web Vitals assessment (LCP, INP, CLS at p75 from the Chrome UX Report) and the Lighthouse performance score for each site.
- **Trend charts**: performance score, LCP, INP, CLS, TBT and TTFB over time, with good / needs improvement / poor bands. Field and lab data are shown together.
- **Regressions**: the latest snapshot compared with the recent baseline, flagged with a severity.

## Tech stack

| Concern    | Choice                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions)                                  |
| Language   | TypeScript (strict)                                                                                               |
| Styling    | Tailwind CSS v4                                                                                                   |
| Charts     | [Recharts](https://recharts.org)                                                                                  |
| Storage    | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) + [Drizzle ORM](https://orm.drizzle.team) |
| Validation | [Zod](https://zod.dev)                                                                                            |
| Testing    | [Vitest](https://vitest.dev)                                                                                      |

## Getting started

Prerequisites: **Node.js 22+** and npm.

```bash
npm install
cp .env.example .env.local     # then fill in PSI_API_KEY / CRON_SECRET as needed
npm run db:seed                # optional: demo sites with 30 days of synthetic history
npm run dev                    # http://localhost:3000
```

The SQLite database is created at `DATABASE_PATH` on first use, and pending migrations are applied automatically.

To start with real data instead of the demo, add sites from the dashboard ("Track a new site"). Then click **Run check now** on a site page or run `npm run collect`.

## Configuration

All configuration is read from environment variables. See [`.env.example`](./.env.example).

| Variable              | Default                 | Description                                                                                              |
| --------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_PATH`       | `./data/observatory.db` | SQLite database file.                                                                                    |
| `PSI_API_KEY`         | _(empty)_               | Google API key for PageSpeed Insights. Optional, but unauthenticated requests are heavily rate limited. |
| `CRON_SECRET`         | _(empty)_               | Shared secret for `POST /api/collect`. The endpoint is disabled while this is unset.                     |
| `COLLECT_CONCURRENCY` | `2`                     | Number of PageSpeed Insights requests to run in parallel (1–10).                                         |

## Collecting snapshots

Each collection run calls PageSpeed Insights once per site per strategy (`mobile`, `desktop`) and stores one snapshot per successful call. Failed calls are reported and don't stop the run.

**From the UI**: click **Run check now** on a site page.

**From the CLI**: suited to a system cron job on the host:

```bash
npm run collect                       # all sites, both strategies
npm run collect -- --site 3           # a single site
npm run collect -- --strategy mobile  # a single strategy
```

**Over HTTP**: for external schedulers. Set `CRON_SECRET`, then send it as a bearer token:

```bash
curl -X POST --oauth2-bearer "$CRON_SECRET" https://observatory.internal/api/collect
curl -X POST --oauth2-bearer "$CRON_SECRET" "https://observatory.internal/api/collect?siteId=3"
```

The endpoint returns `{ succeeded, failed, results }` as JSON. A daily schedule is a sensible default because CrUX field data is a rolling 28-day window. Lab data is noisier, so collect more often if you want to catch regressions sooner.

## How metrics are interpreted

- **Field data** comes from the Chrome UX Report (`loadingExperience`): the 75th percentile over the trailing 28 days. If PSI only has origin-level data, the snapshot is labelled "Origin-level field data".
- **Lab data** comes from the single Lighthouse run that PSI performs (`lighthouseResult.audits`).
- **Thresholds** follow [web.dev/vitals](https://web.dev/articles/vitals): LCP ≤ 2.5 s / 4 s, INP ≤ 200 ms / 500 ms, CLS ≤ 0.1 / 0.25, and so on. They are defined in [`src/lib/vitals.ts`](./src/lib/vitals.ts).
- **Core Web Vitals assessment** passes when p75 LCP, INP and CLS are all "good". INP is skipped if PSI doesn't report it, which matches how PSI assesses low-traffic pages.
- **Regressions** ([`src/lib/regressions.ts`](./src/lib/regressions.ts)) compare the latest snapshot for a site and strategy against the **median of the previous 7 snapshots**. A metric is flagged when it got worse by **≥ 10 %** _and_ by more than a per-metric minimum (for example 100 ms for LCP or 0.01 for CLS), which filters out noise. A regression is **high** severity if the metric also dropped into a worse rating bucket, and **medium** otherwise.

## Scripts

| Script                | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                            |
| `npm run build`       | Production build                                                |
| `npm start`           | Serve the production build                                      |
| `npm run lint`        | ESLint                                                          |
| `npm run typecheck`   | Generate route types and run `tsc --noEmit`                     |
| `npm test`            | Run unit tests (Vitest)                                         |
| `npm run collect`     | Collect PageSpeed Insights snapshots (see above)                |
| `npm run db:seed`     | Insert demo sites with synthetic history                        |
| `npm run db:generate` | Generate a new SQL migration after editing `src/db/schema.ts`   |
| `npm run db:migrate`  | Apply migrations manually (they also run automatically on boot) |

## Project structure

```
drizzle/                 SQL migrations (generated by drizzle-kit, committed)
scripts/
  collect.ts             CLI collector
  seed.ts                Demo data
src/
  app/
    page.tsx             Dashboard: summary, sites table, regressions, add-site form
    sites/[id]/page.tsx  Site detail: current metrics, trend charts, history
    api/collect/         POST endpoint for schedulers
    actions.ts           Server Actions (add / remove site, run check)
  components/            UI primitives, charts (client), forms (client)
  db/                    Drizzle schema and SQLite connection
  lib/                   Pure logic: PSI client/parser, thresholds, regressions, validation
  server/                Data access and the collection job
```

## Deployment notes

- The app stores data in a local SQLite file, so it needs a **persistent disk**: a VM, a container with a volume, or similar. Ephemeral serverless filesystems won't keep history. To scale beyond a single instance, change the Drizzle dialect to Postgres.
- The app has **no built-in authentication**. Deploy it behind your SSO proxy or VPN. `POST /api/collect` is the only route protected by its own secret.

## License

[MIT](./LICENSE)
