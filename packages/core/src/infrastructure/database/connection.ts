import { Kysely } from 'kysely';
import { BunSqliteDialect } from 'kysely-bun-sqlite';
import { Database as BunDatabase } from 'bun:sqlite';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import type { Database } from './schema';

export interface DatabaseConnection {
  db: Kysely<Database>;
  path: string;
  close(): Promise<void>;
}

export function getDefaultDbPath(): string {
  const dataDir = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
  const workopilotDir = join(dataDir, 'workopilot');

  if (!existsSync(workopilotDir)) {
    mkdirSync(workopilotDir, { recursive: true });
  }

  return join(workopilotDir, 'workopilot.db');
}

export function createConnection(dbPath?: string): DatabaseConnection {
  const path = dbPath || getDefaultDbPath();
  const bunDb = new BunDatabase(path);

  const db = new Kysely<Database>({
    dialect: new BunSqliteDialect({ database: bunDb }),
  });

  return {
    db,
    path,
    close: async () => {
      await db.destroy();
    },
  };
}
