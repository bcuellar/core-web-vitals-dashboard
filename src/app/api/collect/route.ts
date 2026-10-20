import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getEnv } from "@/lib/env";
import { parseSiteId } from "@/lib/sites";
import { collectSnapshots } from "@/server/collect";

const AUTH_SCHEME = "Bearer";

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from([AUTH_SCHEME, secret].join(" "));
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Collects fresh snapshots for all sites (or `?siteId=`). Intended for cron
 * jobs; authenticate with an `Authorization` header carrying CRON_SECRET as a
 * bearer token (see README).
 */
export async function POST(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteIdParam = new URL(request.url).searchParams.get("siteId");
  const siteId = siteIdParam === null ? undefined : parseSiteId(siteIdParam);
  if (siteId === null) {
    return Response.json({ error: "siteId must be a positive integer" }, { status: 400 });
  }

  const results = await collectSnapshots({ siteId });
  if (siteId !== undefined && results.length === 0) {
    return Response.json({ error: "Site not found" }, { status: 404 });
  }
  revalidatePath("/", "layout");

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  const status = results.length > 0 && succeeded === 0 ? 502 : 200;
  return Response.json({ succeeded, failed, results }, { status });
}
