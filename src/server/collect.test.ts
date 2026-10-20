import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "observatory-test-"));
process.env.DATABASE_PATH = path.join(tmpDir, "test.db");

const { getDb, schema } = await import("@/db");
const { collectSnapshots } = await import("./collect");

const psiResponse = {
  lighthouseResult: {
    fetchTime: "2026-01-01T00:00:00.000Z",
    categories: { performance: { score: 0.9 } },
    audits: { "largest-contentful-paint": { numericValue: 2000 } },
  },
};

describe("collectSnapshots", () => {
  let siteId: number;

  beforeAll(() => {
    siteId = getDb().insert(schema.sites).values({ name: "Example", url: "https://example.com/" }).returning().get().id;
  });

  beforeEach(() => {
    getDb().delete(schema.snapshots).run();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("stores one snapshot per strategy", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(psiResponse)));
    const results = await collectSnapshots({ siteId });
    expect(results.map((r) => [r.strategy, r.ok])).toEqual([
      ["mobile", true],
      ["desktop", true],
    ]);
    const rows = getDb().select().from(schema.snapshots).all();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ siteId, performanceScore: 90, labLcp: 2000 });
  });

  it("reports PSI failures without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { message: "Quota exceeded" } }, { status: 429 })));
    const results = await collectSnapshots({ siteId, strategies: ["mobile"] });
    expect(results).toEqual([
      expect.objectContaining({ ok: false, error: expect.stringContaining("Quota exceeded") }),
    ]);
    expect(getDb().select().from(schema.snapshots).all()).toHaveLength(0);
  });

  it("reports persistence failures separately from PSI failures", async () => {
    // Delete the site while its PSI request is in flight.
    const doomed = getDb().insert(schema.sites).values({ name: "Doomed", url: "https://doomed.example/" }).returning().get();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        getDb().delete(schema.sites).where(eq(schema.sites.id, doomed.id)).run();
        return Response.json(psiResponse);
      }),
    );
    const results = await collectSnapshots({ siteId: doomed.id, strategies: ["mobile"] });
    expect(results).toEqual([
      expect.objectContaining({ ok: false, error: expect.stringMatching(/^Could not save snapshot:/) }),
    ]);
  });

  it("returns no results for an unknown site", async () => {
    expect(await collectSnapshots({ siteId: 9999 })).toEqual([]);
  });
});
