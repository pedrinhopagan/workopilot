import type { Generated, ColumnType } from "kysely";

// ============================================
// Database Schema Types for Kysely
// ============================================

export interface Database {
  projects: ProjectsTable;
  tasks: TasksTable;
  subtasks: SubtasksTable;
  logs: LogsTable;
  daily_stats: DailyStatsTable;
  settings: SettingsTable;
  operation_logs: OperationLogsTable;
  task_executions: TaskExecutionsTable;
  task_terminals: TaskTerminalsTable;
  activity_logs: ActivityLogsTable;
  user_sessions: UserSessionsTable;
}

// ============================================
// Table Definitions
// ============================================

export interface ProjectsTable {
  id: string;
  name: string;
  path: string;
  description: string | null;
  routes: string; // JSON string
  tmux_config: string; // JSON string
  business_rules: string;
  tmux_configured: number; // 0 or 1
  created_at: Generated<string>;
}

export interface TasksTable {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: number;
  category: string;
  status: string;
  estimated_minutes: number | null;
  due_date: string | null;
  json_path: string | null;
  scheduled_date: string | null;
  created_at: Generated<string>;
  completed_at: string | null;
  // New fields for full task data (to be migrated)
  complexity: string | null;
  initialized: number | null; // 0 or 1
  schema_version: number | null;
  context_description: string | null;
  context_business_rules: string | null; // JSON array
  context_technical_notes: string | null;
  context_acceptance_criteria: string | null; // JSON array
  ai_metadata: string | null; // JSON object
  timestamps_started_at: string | null;
  modified_at: string | null;
  modified_by: string | null; // "user" | "ai"
}

export interface SubtasksTable {
  id: string;
  task_id: string;
  title: string;
  status: string; // pending | in_progress | done
  order: number;
  description: string | null;
  acceptance_criteria: string | null; // JSON array
  technical_notes: string | null;
  prompt_context: string | null;
  created_at: Generated<string>;
  completed_at: string | null;
}

export interface LogsTable {
  id: string;
  project_id: string | null;
  project_name: string | null;
  session_id: string | null;
  summary: string | null;
  files_modified: string | null; // JSON array
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  raw_json: string | null;
  created_at: Generated<string>;
}

export interface DailyStatsTable {
  date: string;
  tokens_used: number;
  tokens_goal: number;
  tasks_completed: number;
}

export interface SettingsTable {
  key: string;
  value: string;
}

export interface OperationLogsTable {
  id: string;
  entity_type: string; // "task" | "subtask" | "project"
  entity_id: string;
  operation: string; // "create" | "update" | "delete"
  old_data: string | null; // JSON
  new_data: string | null; // JSON
  source: string; // "cli" | "app" | "skill"
  created_at: Generated<string>;
}

export interface TaskExecutionsTable {
  id: string;
  task_id: string;
  subtask_id: string | null; // null = full task execution
  execution_type: string; // "full" | "subtask"
  status: string; // "running" | "completed" | "cancelled" | "error"
  current_step: number;
  total_steps: number;
  current_step_description: string | null;
  waiting_for_input: number; // 0 or 1
  tmux_session: string | null;
  pid: number | null;
  last_heartbeat: string;
  error_message: string | null;
  started_at: Generated<string>;
  ended_at: string | null;
}

// Persistent terminal binding - survives across executions (unlike task_executions which is per-run)
export interface TaskTerminalsTable {
  id: string;
  task_id: string;
  tmux_session: string;
  last_subtask_id: string | null;
  created_at: Generated<string>;
  updated_at: string;
}

export interface ActivityLogsTable {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  metadata: string | null;
  created_at: Generated<string>;
}

export interface UserSessionsTable {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  app_version: string | null;
}

// ============================================
// Domain Types (for CLI output)
// ============================================

export interface TaskContext {
  description: string | null;
  business_rules: string[];
  technical_notes: string | null;
  acceptance_criteria: string[] | null;
}

export interface Subtask {
  id: string;
  title: string;
  status: string;
  order: number;
  description: string | null;
  acceptance_criteria: string[] | null;
  technical_notes: string | null;
  prompt_context: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AIMetadata {
  last_interaction: string | null;
  last_completed_action: string | null;
  session_ids: string[];
  tokens_used: number;
  structuring_complete: boolean;
}

export interface TaskTimestamps {
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface TaskFull {
  schema_version: number;
  initialized: boolean;
  id: string;
  title: string;
  status: string;
  priority: number;
  category: string;
  complexity: string | null;
  context: TaskContext;
  subtasks: Subtask[];
  ai_metadata: AIMetadata;
  timestamps: TaskTimestamps;
  modified_at: string | null;
  modified_by: "user" | "ai" | null;
  // Additional fields from tasks table
  project_id: string | null;
  due_date: string | null;
  scheduled_date: string | null;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  routes: ProjectRoute[];
  tmux_config: TmuxConfig;
  business_rules: string;
  tmux_configured: boolean;
  created_at: string;
}

export interface ProjectRoute {
  id: string;
  path: string;
  order: number;
  env_path: string | null;
}

export interface TmuxTab {
  id: string;
  name: string;
  route_id: string;
  startup_command: string | null;
  order: number;
}

export interface TmuxConfig {
  session_name: string;
  tabs: TmuxTab[];
}

// ============================================
// Operation Log Entry
// ============================================

export interface OperationLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  old_data: unknown | null;
  new_data: unknown | null;
  source: string;
  created_at: string;
}

// ============================================
// Task Execution Types
// ============================================

export type ExecutionType = "full" | "subtask";
export type ExecutionStatus = "running" | "completed" | "cancelled" | "error";

export interface TaskExecution {
  id: string;
  task_id: string;
  subtask_id: string | null;
  execution_type: ExecutionType;
  status: ExecutionStatus;
  current_step: number;
  total_steps: number;
  current_step_description: string | null;
  waiting_for_input: boolean;
  tmux_session: string | null;
  pid: number | null;
  last_heartbeat: string;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface TaskTerminal {
  id: string;
  task_id: string;
  tmux_session: string;
  last_subtask_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  app_version: string | null;
}
