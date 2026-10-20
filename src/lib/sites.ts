import { z } from "zod";

export const siteInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .transform((value) => (/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`))
    .pipe(
      z
        .url({ protocol: /^https?$/, message: "Enter a valid http(s) URL" })
        .transform((value) => new URL(value).toString()),
    ),
  name: z.string().trim().max(80, "Name is too long").optional(),
});

export type SiteInput = z.infer<typeof siteInputSchema>;

/** Strictly parses a positive integer id (rejects "", " ", "1e3", "-1", "01x"). */
export function parseSiteId(value: string | null | undefined): number | null {
  if (!value || !/^\d{1,15}$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

export function siteSlug(url: string): string {
  const { hostname } = new URL(url);
  const host = hostname.replace(/^www\./i, "").replace(/\.$/, "");
  const parts = host.split(".").filter(Boolean);
  if (parts.length === 0) return "site";

  const meaningful = parts.length <= 1 ? parts : parts.slice(0, -1);
  return meaningful
    .map((part) => part.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase())
    .filter(Boolean)
    .join("-") || "site";
}

export function defaultSiteName(url: string): string {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, "");
  return pathname === "/" ? host : `${host}${pathname.replace(/\/$/, "")}`;
}
