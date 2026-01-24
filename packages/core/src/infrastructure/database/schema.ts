import type { Generated, Selectable, Insertable, Updateable } from 'kysely';

export interface ProjectsTable {
  id: string;
  name: string;
  path: string;
  description: string | null;
  routes: string;
  tmux_config: string;
  business_rules: string;
  tmux_configured: number;
  display_order: number;
  color: string | null;
  created_at: Generated<string>;
}

export interface TasksTable {
  id: string;
  project_id: string | null;
  title: string;
  main_prompt: string | null;
  description: string | null;
  priority: number;
  category: string;
  status: string;
  due_date: string | null;
  scheduled_date: string | null;
  created_at: Generated<string>;
  completed_at: string | null;
  complexity: string | null;
  business_rules: string | null;
  technical_notes: string | null;
  acceptance_criteria: string | null;
  ai_metadata: string | null;
  timestamps_started_at: string | null;
  modified_at: string | null;
}

export interface SubtasksTable {
  id: string;
  task_id: string;
  title: string;
  status: string;
  order: number;
  description: string | null;
  acceptance_criteria: string | null;
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
  files_modified: string | null;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  raw_json: string | null;
  created_at: Generated<string>;
}

export interface SettingsTable {
  key: string;
  value: string;
}

export interface OperationLogsTable {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  old_data: string | null;
  new_data: string | null;
  source: string;
  created_at: Generated<string>;
}

export interface TaskExecutionsTable {
  id: string;
  task_id: string;
  subtask_id: string | null;
  execution_type: string;
  status: string;
  current_step: number;
  total_steps: number;
  current_step_description: string | null;
  waiting_for_input: number;
  tmux_session: string | null;
  pid: number | null;
  last_heartbeat: string;
  error_message: string | null;
  started_at: Generated<string>;
  ended_at: string | null;
}

export interface TaskTerminalsTable {
  id: string;
  task_id: string;
  tmux_session: string;
  last_subtask_id: string | null;
  created_at: Generated<string>;
  updated_at: string;
}

export interface TaskImagesTable {
  id: string;
  task_id: string;
  data: Uint8Array;
  mime_type: string;
  file_name: string;
  created_at: Generated<string>;
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

export interface Database {
  projects: ProjectsTable;
  tasks: TasksTable;
  subtasks: SubtasksTable;
  logs: LogsTable;
  settings: SettingsTable;
  operation_logs: OperationLogsTable;
  task_executions: TaskExecutionsTable;
  task_terminals: TaskTerminalsTable;
  task_images: TaskImagesTable;
  activity_logs: ActivityLogsTable;
  user_sessions: UserSessionsTable;
}

export type ProjectRow = Selectable<ProjectsTable>;
export type TaskRow = Selectable<TasksTable>;
export type SubtaskRow = Selectable<SubtasksTable>;
export type LogRow = Selectable<LogsTable>;
export type TaskExecutionRow = Selectable<TaskExecutionsTable>;
export type TaskTerminalRow = Selectable<TaskTerminalsTable>;
export type TaskImageRow = Selectable<TaskImagesTable>;
export type ActivityLogRow = Selectable<ActivityLogsTable>;
export type OperationLogRow = Selectable<OperationLogsTable>;

export type NewProject = Insertable<ProjectsTable>;
export type NewTask = Insertable<TasksTable>;
export type NewSubtask = Insertable<SubtasksTable>;
export type NewTaskExecution = Insertable<TaskExecutionsTable>;
export type NewTaskTerminal = Insertable<TaskTerminalsTable>;

export type ProjectUpdate = Updateable<ProjectsTable>;
export type TaskUpdate = Updateable<TasksTable>;
export type SubtaskUpdate = Updateable<SubtasksTable>;
export type TaskExecutionUpdate = Updateable<TaskExecutionsTable>;
