import { Kysely } from 'kysely';
import type { Database } from './database/schema';
import { createConnection, getDefaultDbPath } from './database/connection';
import type { DatabaseConnection } from './database/connection';
import { runMigrations } from './database/migrations/runner';
import type { MigrationResult } from './database/migrations/runner';

import { SqliteTaskRepository } from './repositories/SqliteTaskRepository';
import { SqliteSubtaskRepository } from './repositories/SqliteSubtaskRepository';
import { SqliteProjectRepository } from './repositories/SqliteProjectRepository';
import { SqliteExecutionRepository } from './repositories/SqliteExecutionRepository';
import { SqliteSettingsRepository } from './repositories/SqliteSettingsRepository';

import type { TaskRepository } from '../application/ports/TaskRepository';
import type { SubtaskRepository } from '../application/ports/SubtaskRepository';
import type { ProjectRepository } from '../application/ports/ProjectRepository';
import type { ExecutionRepository } from '../application/ports/ExecutionRepository';
import type { SettingsRepository } from '../application/ports/SettingsRepository';

export interface Core {
  db: Kysely<Database>;
  dbPath: string;
  
  tasks: TaskRepository;
  subtasks: SubtaskRepository;
  projects: ProjectRepository;
  executions: ExecutionRepository;
  settings: SettingsRepository;
  
  migrate(): Promise<MigrationResult[]>;
  close(): Promise<void>;
}

export interface CreateCoreOptions {
  dbPath?: string;
  autoMigrate?: boolean;
}

export async function createCore(options?: CreateCoreOptions): Promise<Core> {
  const connection = createConnection(options?.dbPath);
  
  if (options?.autoMigrate !== false) {
    await runMigrations(connection.db);
  }

  const tasks = new SqliteTaskRepository(connection.db);
  const subtasks = new SqliteSubtaskRepository(connection.db);
  const projects = new SqliteProjectRepository(connection.db);
  const executions = new SqliteExecutionRepository(connection.db);
  const settings = new SqliteSettingsRepository(connection.db);

  return {
    db: connection.db,
    dbPath: connection.path,
    tasks,
    subtasks,
    projects,
    executions,
    settings,
    migrate: () => runMigrations(connection.db),
    close: () => connection.close(),
  };
}

export { getDefaultDbPath };
export type { DatabaseConnection, MigrationResult };
