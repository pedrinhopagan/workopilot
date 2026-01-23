import type { TaskStatus } from '../value-objects/TaskStatus';
import type { TaskPriority } from '../value-objects/TaskPriority';
import type { TaskCategory } from '../value-objects/TaskCategory';
import type { TaskComplexity } from '../value-objects/TaskComplexity';
import type { Subtask } from './Subtask';

export interface TaskContext {
  description: string | null;
  business_rules: string[];
  technical_notes: string | null;
  acceptance_criteria: string[] | null;
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

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  complexity: TaskComplexity | null;
  due_date: string | null;
  scheduled_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TaskFull {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  complexity: TaskComplexity | null;
  context: TaskContext;
  subtasks: Subtask[];
  ai_metadata: AIMetadata;
  timestamps: TaskTimestamps;
  modified_at: string | null;
  project_id: string | null;
  due_date: string | null;
  scheduled_date: string | null;
}

export interface CreateTaskInput {
  project_id: string | null;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  category?: TaskCategory;
  complexity?: TaskComplexity | null;
  due_date?: string | null;
  scheduled_date?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  category?: TaskCategory;
  status?: TaskStatus;
  complexity?: TaskComplexity | null;
  due_date?: string | null;
  scheduled_date?: string | null;
  context?: Partial<TaskContext>;
  ai_metadata?: Partial<AIMetadata>;
}
