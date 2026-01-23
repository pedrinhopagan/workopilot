import type { Task, TaskFull } from '../../domain/entities/Task';
import type { Subtask } from '../../domain/entities/Subtask';

export interface StructuredSubtask {
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  technicalNotes?: string;
  order: number;
}

export interface TaskStructureResult {
  subtasks: StructuredSubtask[];
  context?: {
    technicalNotes?: string;
    acceptanceCriteria?: string[];
  };
  tokensUsed: number;
}

export interface ExecutionPrompt {
  taskContext: string;
  subtaskContext: string;
  projectContext?: string;
  previousActions?: string[];
}

export interface AIServiceConfig {
  provider: 'opencode' | 'openai' | 'anthropic' | 'custom';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIService {
  configure(config: AIServiceConfig): Promise<void>;
  
  structureTask(task: Task, projectContext?: string): Promise<TaskStructureResult>;
  
  generateExecutionPrompt(task: TaskFull, subtask: Subtask): Promise<ExecutionPrompt>;
  
  suggestNextActions(task: TaskFull): Promise<string[]>;
  
  summarizeProgress(task: TaskFull): Promise<string>;
  
  isAvailable(): Promise<boolean>;
  getConfig(): AIServiceConfig | null;
}
