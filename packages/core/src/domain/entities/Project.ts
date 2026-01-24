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

export interface Project {
  id: string;
  name: string;
  path: string;
  description: string | null;
  routes: ProjectRoute[];
  tmux_config: TmuxConfig;
  business_rules: string;
  tmux_configured: boolean;
  display_order: number;
  color: string | null;
  created_at: string;
}

export interface CreateProjectInput {
  name: string;
  path: string;
  description?: string | null;
  routes?: ProjectRoute[];
  tmux_config?: TmuxConfig;
  business_rules?: string;
}

export interface UpdateProjectInput {
  name?: string;
  path?: string;
  description?: string | null;
  routes?: ProjectRoute[];
  tmux_config?: TmuxConfig;
  business_rules?: string;
  tmux_configured?: boolean;
  display_order?: number;
  color?: string | null;
}

export interface ProjectStats {
  project_id: string;
  total_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  done_tasks: number;
  completion_percent: number;
  last_task_modified_at: string | null;
}
