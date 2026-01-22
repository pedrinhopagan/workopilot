import { Kysely, sql } from 'kysely';
import type { Database } from '../schema';

export interface MigrationResult {
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

async function ensureProjectsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'projects');
  if (exists) {
    const hasDisplayOrder = await columnExists(db, 'projects', 'display_order');
    if (!hasDisplayOrder) {
      await sql`ALTER TABLE projects ADD COLUMN display_order INTEGER DEFAULT 0`.execute(db);
      return { name: 'add_projects_display_order', success: true, message: 'Added display_order column' };
    }
    return { name: 'ensure_projects_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      description TEXT,
      routes TEXT DEFAULT '[]',
      tmux_config TEXT DEFAULT '{"session_name":"","tabs":[]}',
      business_rules TEXT DEFAULT '',
      tmux_configured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  return { name: 'create_projects_table', success: true, message: 'Table created' };
}

async function ensureTasksTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'tasks');
  if (!exists) {
    await sql`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT,
        priority INTEGER DEFAULT 2,
        category TEXT DEFAULT 'feature',
        status TEXT DEFAULT 'pending',
        estimated_minutes INTEGER,
        due_date TEXT,
        json_path TEXT,
        scheduled_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        complexity TEXT,
        initialized INTEGER DEFAULT 0,
        schema_version INTEGER DEFAULT 2,
        context_description TEXT,
        context_business_rules TEXT,
        context_technical_notes TEXT,
        context_acceptance_criteria TEXT,
        ai_metadata TEXT,
        timestamps_started_at TEXT,
        modified_at TEXT,
        modified_by TEXT
      )
    `.execute(db);
    await sql`CREATE INDEX idx_tasks_project_id ON tasks(project_id)`.execute(db);
    await sql`CREATE INDEX idx_tasks_status ON tasks(status)`.execute(db);
    await sql`CREATE INDEX idx_tasks_scheduled_date ON tasks(scheduled_date)`.execute(db);
    return { name: 'create_tasks_table', success: true, message: 'Table created with indexes' };
  }

  const columnsToAdd = [
    { name: 'complexity', type: 'TEXT' },
    { name: 'initialized', type: 'INTEGER DEFAULT 0' },
    { name: 'schema_version', type: 'INTEGER DEFAULT 2' },
    { name: 'context_description', type: 'TEXT' },
    { name: 'context_business_rules', type: 'TEXT' },
    { name: 'context_technical_notes', type: 'TEXT' },
    { name: 'context_acceptance_criteria', type: 'TEXT' },
    { name: 'ai_metadata', type: 'TEXT' },
    { name: 'timestamps_started_at', type: 'TEXT' },
    { name: 'modified_at', type: 'TEXT' },
    { name: 'modified_by', type: 'TEXT' },
  ];

  const added: string[] = [];
  for (const col of columnsToAdd) {
    const colExists = await columnExists(db, 'tasks', col.name);
    if (!colExists) {
      await sql`ALTER TABLE tasks ADD COLUMN ${sql.raw(col.name)} ${sql.raw(col.type)}`.execute(db);
      added.push(col.name);
    }
  }

  return {
    name: 'migrate_tasks_table',
    success: true,
    message: added.length > 0 ? `Added columns: ${added.join(', ')}` : 'No changes needed',
  };
}

async function ensureSubtasksTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'subtasks');
  if (exists) {
    return { name: 'ensure_subtasks_table', success: true, message: 'Table already exists' };
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

  return { name: 'create_subtasks_table', success: true, message: 'Table created with index' };
}

async function ensureLogsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'logs');
  if (exists) {
    return { name: 'ensure_logs_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE logs (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      project_name TEXT,
      session_id TEXT,
      summary TEXT,
      files_modified TEXT,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      tokens_total INTEGER DEFAULT 0,
      raw_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  return { name: 'create_logs_table', success: true, message: 'Table created' };
}

async function ensureDailyStatsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'daily_stats');
  if (exists) {
    return { name: 'ensure_daily_stats_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE daily_stats (
      date TEXT PRIMARY KEY,
      tokens_used INTEGER DEFAULT 0,
      tokens_goal INTEGER DEFAULT 100000,
      tasks_completed INTEGER DEFAULT 0
    )
  `.execute(db);

  return { name: 'create_daily_stats_table', success: true, message: 'Table created' };
}

async function ensureSettingsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'settings');
  if (exists) {
    return { name: 'ensure_settings_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `.execute(db);

  return { name: 'create_settings_table', success: true, message: 'Table created' };
}

async function ensureOperationLogsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'operation_logs');
  if (exists) {
    return { name: 'ensure_operation_logs_table', success: true, message: 'Table already exists' };
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

  return { name: 'create_operation_logs_table', success: true, message: 'Table created with indexes' };
}

async function ensureTaskExecutionsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'task_executions');
  if (exists) {
    return { name: 'ensure_task_executions_table', success: true, message: 'Table already exists' };
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

  return { name: 'create_task_executions_table', success: true, message: 'Table created with indexes' };
}

async function ensureTaskTerminalsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'task_terminals');
  if (exists) {
    return { name: 'ensure_task_terminals_table', success: true, message: 'Table already exists' };
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

  return { name: 'create_task_terminals_table', success: true, message: 'Table created with indexes' };
}

async function ensureTaskImagesTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'task_images');
  if (exists) {
    return { name: 'ensure_task_images_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE task_images (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      data BLOB NOT NULL,
      mime_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  await sql`CREATE INDEX idx_task_images_task_id ON task_images(task_id)`.execute(db);

  return { name: 'create_task_images_table', success: true, message: 'Table created with index' };
}

async function ensureActivityLogsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'activity_logs');
  if (exists) {
    return { name: 'ensure_activity_logs_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE activity_logs (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      project_id TEXT REFERENCES projects(id),
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `.execute(db);

  await sql`CREATE INDEX idx_activity_logs_event_type ON activity_logs(event_type)`.execute(db);
  await sql`CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id)`.execute(db);
  await sql`CREATE INDEX idx_activity_logs_project_id ON activity_logs(project_id)`.execute(db);
  await sql`CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at)`.execute(db);

  return { name: 'create_activity_logs_table', success: true, message: 'Table created with indexes' };
}

async function ensureUserSessionsTable(db: Kysely<Database>): Promise<MigrationResult> {
  const exists = await tableExists(db, 'user_sessions');
  if (exists) {
    return { name: 'ensure_user_sessions_table', success: true, message: 'Table already exists' };
  }

  await sql`
    CREATE TABLE user_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER,
      app_version TEXT
    )
  `.execute(db);

  return { name: 'create_user_sessions_table', success: true, message: 'Table created' };
}

async function migrateTaskStatusValues(db: Kysely<Database>): Promise<MigrationResult> {
  const doneCount = await sql`UPDATE tasks SET status = 'completed' WHERE status = 'done'`.execute(db);
  const activeCount = await sql`UPDATE tasks SET status = 'working' WHERE status = 'active'`.execute(db);
  
  return {
    name: 'migrate_task_status_values',
    success: true,
    message: `Migrated ${doneCount.numAffectedRows || 0} done->completed, ${activeCount.numAffectedRows || 0} active->working`,
  };
}

export async function runMigrations(db: Kysely<Database>): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  try {
    results.push(await ensureProjectsTable(db));
    results.push(await ensureTasksTable(db));
    results.push(await ensureSubtasksTable(db));
    results.push(await ensureLogsTable(db));
    results.push(await ensureDailyStatsTable(db));
    results.push(await ensureSettingsTable(db));
    results.push(await ensureOperationLogsTable(db));
    results.push(await ensureTaskExecutionsTable(db));
    results.push(await ensureTaskTerminalsTable(db));
    results.push(await ensureTaskImagesTable(db));
    results.push(await ensureActivityLogsTable(db));
    results.push(await ensureUserSessionsTable(db));
    results.push(await migrateTaskStatusValues(db));
  } catch (error) {
    results.push({
      name: 'migration_error',
      success: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}
