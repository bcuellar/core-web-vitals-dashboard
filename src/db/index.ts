import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __observatoryDb?: DB };

/**
 * Returns a lazily-initialised SQLite connection. Pending migrations in
 * `./drizzle` are applied on first use so a fresh checkout works out of the box.
 */
export function getDb(): DB {
  if (globalForDb.__observatoryDb) return globalForDb.__observatoryDb;

  const dbPath = path.resolve(getEnv().DATABASE_PATH);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });

  globalForDb.__observatoryDb = db;
  return db;
}

export { schema };
