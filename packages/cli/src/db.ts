import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-sqlite";
import { Database as BunDatabase } from "bun:sqlite";
import { homedir } from "os";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import type { Database } from "./types";

let dbInstance: Kysely<Database> | null = null;

function getDbPath(): string {
  const dataDir =
    process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  const workopilotDir = join(dataDir, "workopilot");

  if (!existsSync(workopilotDir)) {
    mkdirSync(workopilotDir, { recursive: true });
  }

  return join(workopilotDir, "workopilot.db");
}

export function getDb(): Kysely<Database> {
  if (!dbInstance) {
    const dbPath = getDbPath();
    const bunDb = new BunDatabase(dbPath);

    dbInstance = new Kysely<Database>({
      dialect: new BunSqliteDialect({ database: bunDb }),
    });
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}

export function getDbPathInfo(): string {
  return getDbPath();
}
