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
}
