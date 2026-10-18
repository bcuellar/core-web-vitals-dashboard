const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function formatRelative(date: Date, now = new Date()): string {
  const diff = date.getTime() - now.getTime();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relative.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
