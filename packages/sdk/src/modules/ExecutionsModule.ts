import type { Core } from '@workopilot/core';
import type {
  TaskExecution,
  TaskTerminal,
  StartExecutionInput,
  UpdateExecutionInput,
  LinkTerminalInput,
} from '@workopilot/core';

export class ExecutionsModule {
  constructor(private core: Core) {}

  async get(id: string): Promise<TaskExecution | null> {
    return this.core.executions.findById(id);
  }

  async getActiveForTask(taskId: string): Promise<TaskExecution | null> {
    return this.core.executions.findActiveByTaskId(taskId);
  }

  async listAllActive(): Promise<TaskExecution[]> {
    return this.core.executions.findAllActive();
  }

  async start(input: StartExecutionInput): Promise<TaskExecution> {
    return this.core.executions.start(input);
  }

  async update(id: string, input: UpdateExecutionInput): Promise<TaskExecution> {
    return this.core.executions.update(id, input);
  }

  async end(taskId: string, errorMessage?: string | null): Promise<TaskExecution> {
    return this.core.executions.end(taskId, errorMessage);
  }

  async cleanupStale(maxAgeMinutes?: number): Promise<number> {
    return this.core.executions.cleanupStale(maxAgeMinutes);
  }

  async getTerminalForTask(taskId: string): Promise<TaskTerminal | null> {
    return this.core.executions.findTerminalByTaskId(taskId);
  }

  async linkTerminal(input: LinkTerminalInput): Promise<TaskTerminal> {
    return this.core.executions.linkTerminal(input);
  }

  async unlinkTerminal(taskId: string): Promise<void> {
    return this.core.executions.unlinkTerminal(taskId);
  }

  async updateTerminalSubtask(taskId: string, subtaskId: string | null): Promise<TaskTerminal> {
    return this.core.executions.updateTerminalSubtask(taskId, subtaskId);
  }
}
