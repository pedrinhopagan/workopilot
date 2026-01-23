export interface SessionLog {
  id: string;
  project_id: string | null;
  project_name: string | null;
  session_id: string | null;
  summary: string | null;
  files_modified: string[] | null;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  raw_json: string | null;
  created_at: string;
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

export interface OperationLog {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  old_data: unknown | null;
  new_data: unknown | null;
  source: string;
  created_at: string;
}

export interface CreateActivityLogInput {
  event_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  project_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateOperationLogInput {
  entity_type: string;
  entity_id: string;
  operation: string;
  old_data?: unknown | null;
  new_data?: unknown | null;
  source: string;
}
