import type { ExecutionStatus } from '../value-objects/ExecutionStatus';
import type { ExecutionType } from '../value-objects/ExecutionType';

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

export interface StartExecutionInput {
  task_id: string;
  subtask_id?: string | null;
  execution_type: ExecutionType;
  total_steps?: number;
  tmux_session?: string | null;
  pid?: number | null;
}

export interface UpdateExecutionInput {
  status?: ExecutionStatus;
  current_step?: number;
  total_steps?: number;
  current_step_description?: string | null;
  waiting_for_input?: boolean;
  error_message?: string | null;
}

export interface LinkTerminalInput {
  task_id: string;
  tmux_session: string;
  last_subtask_id?: string | null;
}
