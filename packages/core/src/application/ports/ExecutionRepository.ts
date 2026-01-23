import type { TaskExecution, TaskTerminal, StartExecutionInput, UpdateExecutionInput, LinkTerminalInput } from '../../domain/entities/Execution';

export interface ExecutionRepository {
  findById(id: string): Promise<TaskExecution | null>;
  findActiveByTaskId(taskId: string): Promise<TaskExecution | null>;
  findAllActive(): Promise<TaskExecution[]>;
  start(input: StartExecutionInput): Promise<TaskExecution>;
  update(id: string, input: UpdateExecutionInput): Promise<TaskExecution>;
  end(taskId: string, errorMessage?: string | null): Promise<TaskExecution>;
  cleanupStale(maxAgeMinutes?: number): Promise<number>;
  
  findTerminalByTaskId(taskId: string): Promise<TaskTerminal | null>;
  linkTerminal(input: LinkTerminalInput): Promise<TaskTerminal>;
  unlinkTerminal(taskId: string): Promise<void>;
  updateTerminalSubtask(taskId: string, subtaskId: string | null): Promise<TaskTerminal>;
}
