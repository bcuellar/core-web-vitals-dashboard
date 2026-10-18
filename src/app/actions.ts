"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { defaultSiteName, siteInputSchema } from "@/lib/sites";
import { collectSnapshots } from "@/server/collect";

export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function addSite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = siteInputSchema.safeParse({
    url: formData.get("url") ?? "",
    name: formData.get("name") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { url, name } = parsed.data;
  const { changes } = getDb()
    .insert(schema.sites)
    .values({ url, name: name || defaultSiteName(url) })
    .onConflictDoNothing({ target: schema.sites.url })
    .run();
  if (changes === 0) {
    return { status: "error", message: `${url} is already being tracked` };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: `Added ${url}. Run a check to collect the first snapshot.` };
}

export async function deleteSite(siteId: number): Promise<void> {
  getDb().delete(schema.sites).where(eq(schema.sites.id, siteId)).run();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function collectSite(siteId: number, _prev: ActionState): Promise<ActionState> {
  const results = await collectSnapshots({ siteId });
  revalidatePath("/", "layout");

  if (results.length === 0) return { status: "error", message: "Site not found" };
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    return { status: "success", message: `Snapshots collected (${results.map((r) => r.strategy).join(", ")}).` };
  }
  return {
    status: "error",
    message: failed.map((r) => `${r.strategy}: ${r.error}`).join(" · "),
  };
}
