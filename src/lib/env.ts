import { z } from "zod";

const envSchema = z.object({
  DATABASE_PATH: z.string().min(1).default("./data/observatory.db"),
  PSI_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  COLLECT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    // Treat empty strings (e.g. `PSI_API_KEY=` in .env) as unset.
    const raw = Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== ""),
    );
    cached = envSchema.parse(raw);
  }
  return cached;
}
