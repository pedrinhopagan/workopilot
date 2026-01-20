export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ProjectRoute {
  id: string;
  path: string;
  order: number;
  env_path?: string;
}

export interface TmuxTab {
  id: string;
  name: string;
  route_id: string;
  startup_command?: string;
  order: number;
}

export interface TmuxConfig {
  session_name: string;
  tabs: TmuxTab[];
}

export interface ProjectWithConfig {
  id: string;
  name: string;
  path: string;
  description?: string;
  routes: ProjectRoute[];
  tmux_config: TmuxConfig;
  business_rules: string;
  tmux_configured: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: number;
  category: string;
  status: string;
  due_date: string | null;
  json_path: string | null;
  created_at: string | null;
  scheduled_date: string | null;
}

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
  modified_at?: string | null;
  modified_by?: "user" | "ai" | null;
}

export interface TaskUpdatedPayload {
  task_id: string;
  project_path: string;
  source: "user" | "ai";
}

export interface SessionLog {
  id: string;
  project_name: string;
  summary: string;
  tokens_total: number;
  created_at: string;
  files_modified: FileModified[];
}

export interface FileModified {
  path: string;
  action: string;
}

export interface CalendarTask {
  id: string;
  title: string;
  project_id: string | null;
  project_name: string;
  priority: number;
  category: string;
  status: string;
  scheduled_date: string;
  due_date: string | null;
  is_overdue: boolean;
  subtask_count: number;
  subtask_done_count: number;
}
