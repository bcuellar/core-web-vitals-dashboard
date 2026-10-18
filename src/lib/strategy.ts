import type { Strategy } from "@/db/schema";

export function parseStrategy(value: string | string[] | undefined): Strategy {
  return value === "desktop" ? "desktop" : "mobile";
}

export function withStrategy(path: string, strategy: Strategy): string {
  return strategy === "mobile" ? path : `${path}?strategy=${strategy}`;
}
