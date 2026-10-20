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

export function defaultSiteName(url: string): string {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, "");
  return pathname === "/" ? host : `${host}${pathname.replace(/\/$/, "")}`;
}
