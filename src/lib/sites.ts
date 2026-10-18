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

export function defaultSiteName(url: string): string {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, "");
  return pathname === "/" ? host : `${host}${pathname.replace(/\/$/, "")}`;
}
