import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const STRATEGIES = ["mobile", "desktop"] as const;
export type Strategy = (typeof STRATEGIES)[number];

export const sites = sqliteTable("sites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const snapshots = sqliteTable(
  "snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    strategy: text("strategy", { enum: STRATEGIES }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),

    // Lighthouse category scores (0-100)
    performanceScore: real("performance_score"),
    accessibilityScore: real("accessibility_score"),
    bestPracticesScore: real("best_practices_score"),
    seoScore: real("seo_score"),

    // Field data (CrUX, 75th percentile over the trailing 28 days)
    fieldSource: text("field_source", { enum: ["url", "origin"] }),
    fieldLcp: real("field_lcp"),
    fieldInp: real("field_inp"),
    fieldCls: real("field_cls"),
    fieldFcp: real("field_fcp"),
    fieldTtfb: real("field_ttfb"),

    // Lab data (Lighthouse run)
    labLcp: real("lab_lcp"),
    labCls: real("lab_cls"),
    labTbt: real("lab_tbt"),
    labFcp: real("lab_fcp"),
    labSpeedIndex: real("lab_speed_index"),
    labTtfb: real("lab_ttfb"),
  },
  (t) => [index("snapshots_site_strategy_fetched_idx").on(t.siteId, t.strategy, t.fetchedAt)],
);

export type Site = typeof sites.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
