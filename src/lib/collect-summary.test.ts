import { describe, expect, it } from "vitest";
import type { Strategy } from "@/db/schema";
import { summarizeCollectResults } from "./collect-summary";

describe("summarizeCollectResults", () => {
    it("reports a successful batch when all jobs succeed", () => {
        const results: Array<{ siteId: number; url: string; strategy: Strategy; ok: boolean }> = [
            { siteId: 1, url: "https://example.com/", strategy: "mobile", ok: true },
            { siteId: 1, url: "https://example.com/", strategy: "desktop", ok: true },
        ];

        expect(summarizeCollectResults(results)).toEqual({
            ok: true,
            message: "Snapshots collected (2).",
        });
    });

    it("summarizes the failed strategies without hiding the error details", () => {
        const results: Array<{ siteId: number; url: string; strategy: Strategy; ok: boolean; error?: string }> = [
            { siteId: 2, url: "https://shop.example.com/", strategy: "mobile", ok: false, error: "Quota exceeded" },
            { siteId: 2, url: "https://shop.example.com/", strategy: "desktop", ok: true },
        ];

        expect(summarizeCollectResults(results)).toEqual({
            ok: false,
            message: "mobile: Quota exceeded",
        });
    });
});
