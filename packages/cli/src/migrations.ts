import { Kysely, sql } from "kysely";
import type { Database } from "./types";

interface MigrationResult {
  name: string;
  success: boolean;
  message: string;
}

async function columnExists(
  db: Kysely<Database>,
  table: string,
  column: string
): Promise<boolean> {
  const result = await sql<{ name: string }>`PRAGMA table_info(${sql.raw(table)})`.execute(db);
  return result.rows.some((row) => row.name === column);
}

async function tableExists(db: Kysely<Database>, table: string): Promise<boolean> {
  const result = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type='table' AND name=${table}
  `.execute(db);
  return result.rows.length > 0;
}

async function migrateTasksTable(db: Kysely<Database>): Promise<MigrationResult> {
  const columnsToAdd = [
    { name: "complexity", type: "TEXT" },
    { name: "initialized", type: "INTEGER DEFAULT 0" },
    { name: "schema_version", type: "INTEGER DEFAULT 2" },
    { name: "context_description", type: "TEXT" },
    { name: "context_business_rules", type: "TEXT" },
    { name: "context_technical_notes", type: "TEXT" },
    { name: "context_acceptance_criteria", type: "TEXT" },
    { name: "ai_metadata", type: "TEXT" },
    { name: "timestamps_started_at", type: "TEXT" },
    { name: "modified_at", type: "TEXT" },
    { name: "modified_by", type: "TEXT" },
  ];

  const added: string[] = [];

  for (const col of columnsToAdd) {
    const exists = await columnExists(db, "tasks", col.name);
    if (!exists) {
      await sql`ALTER TABLE tasks ADD COLUMN ${sql.raw(col.name)} ${sql.raw(col.type)}`.execute(db);
      added.push(col.name);
    }
  }

  return {
    name: "migrate_tasks_table",
    success: true,
    message: added.length > 0 ? `Added columns: ${added.join(", ")}` : "No changes needed",
  };
}

async function createSubtasksTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, "subtasks");
  if (exists) {
    return {
      name: "create_subtasks_table",
      success: true,
      message: "Table already exists",
    };
  }

  await sql`
    CREATE TABLE subtasks (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      "order" INTEGER DEFAULT 0,
      description TEXT,
      acceptance_criteria TEXT,
      technical_notes TEXT,
      prompt_context TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `.execute(db);

  await sql`CREATE INDEX idx_subtasks_task_id ON subtasks(task_id)`.execute(db);

  return {
    name: "create_subtasks_table",
    success: true,
    message: "Table created with index",
  };
}

async function createOperationLogsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, "operation_logs");
  if (exists) {
    return {
      name: "create_operation_logs_table",
      success: true,
      message: "Table already exists",
    };
  }

  await sql`
    CREATE TABLE operation_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      old_data TEXT,
      new_data TEXT,
      source TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  await sql`CREATE INDEX idx_operation_logs_entity ON operation_logs(entity_type, entity_id)`.execute(db);
  await sql`CREATE INDEX idx_operation_logs_created ON operation_logs(created_at)`.execute(db);

  return {
    name: "create_operation_logs_table",
    success: true,
    message: "Table created with indexes",
  };
}

async function createTaskExecutionsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, "task_executions");
  if (exists) {
    return {
      name: "create_task_executions_table",
      success: true,
      message: "Table already exists",
    };
  }

  await sql`
    CREATE TABLE task_executions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      subtask_id TEXT REFERENCES subtasks(id) ON DELETE CASCADE,
      execution_type TEXT NOT NULL DEFAULT 'full',
      status TEXT NOT NULL DEFAULT 'running',
      current_step INTEGER DEFAULT 0,
      total_steps INTEGER DEFAULT 0,
      current_step_description TEXT,
      waiting_for_input INTEGER DEFAULT 0,
      tmux_session TEXT,
      pid INTEGER,
      last_heartbeat TEXT DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ended_at TEXT
    )
  `.execute(db);

  await sql`CREATE INDEX idx_task_executions_task_id ON task_executions(task_id)`.execute(db);
  await sql`CREATE INDEX idx_task_executions_status ON task_executions(status)`.execute(db);
  await sql`CREATE UNIQUE INDEX idx_task_executions_running ON task_executions(task_id) WHERE status = 'running'`.execute(db);

  return {
    name: "create_task_executions_table",
    success: true,
    message: "Table created with indexes",
  };
}

async function createTaskTerminalsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, "task_terminals");
  if (exists) {
    return {
      name: "create_task_terminals_table",
      success: true,
      message: "Table already exists",
    };
  }

  await sql`
    CREATE TABLE task_terminals (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tmux_session TEXT NOT NULL,
      last_subtask_id TEXT REFERENCES subtasks(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  await sql`CREATE UNIQUE INDEX idx_task_terminals_task_id ON task_terminals(task_id)`.execute(db);
  await sql`CREATE INDEX idx_task_terminals_tmux_session ON task_terminals(tmux_session)`.execute(db);

  return {
    name: "create_task_terminals_table",
    success: true,
    message: "Table created with indexes",
  };
}

export async function runMigrations(db: Kysely<Database>): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  try {
    results.push(await migrateTasksTable(db));
    results.push(await createSubtasksTable(db));
    results.push(await createOperationLogsTable(db));
    results.push(await createTaskExecutionsTable(db));
    results.push(await createTaskTerminalsTable(db));
  } catch (error) {
    results.push({
      name: "migration_error",
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}
