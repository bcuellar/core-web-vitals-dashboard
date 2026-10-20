import type { CollectResult } from "@/server/collect";

export function summarizeCollectResults(
    results: CollectResult[],
    options: { mode?: "batch" | "site" } = {},
): { ok: boolean; message: string } {
    if (results.length === 0) {
        return { ok: false, message: "No sites to collect." };
    }

    const failed = results.filter((result) => !result.ok);
    if (failed.length === 0) {
        if (options.mode === "site") {
            return { ok: true, message: `Snapshots collected (${results.map((result) => result.strategy).join(", ")}).` };
        }
        return { ok: true, message: `Snapshots collected (${results.length}).` };
    }

    const message = failed.map((result) => `${result.strategy}: ${result.error ?? "Unknown error"}`).join(" · ");
    return { ok: false, message };
}
