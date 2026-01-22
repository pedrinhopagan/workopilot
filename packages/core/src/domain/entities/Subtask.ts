import type { SubtaskStatus } from '../value-objects/SubtaskStatus';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  status: SubtaskStatus;
  order: number;
  description: string | null;
  acceptance_criteria: string[] | null;
  technical_notes: string | null;
  prompt_context: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateSubtaskInput {
  task_id: string;
  title: string;
  description?: string | null;
  order?: number;
  acceptance_criteria?: string[] | null;
  technical_notes?: string | null;
  prompt_context?: string | null;
}

export interface UpdateSubtaskInput {
  title?: string;
  status?: SubtaskStatus;
  description?: string | null;
  order?: number;
  acceptance_criteria?: string[] | null;
  technical_notes?: string | null;
  prompt_context?: string | null;
}
