import type { Core } from '@workopilot/core';
import type {
  Subtask,
  CreateSubtaskInput,
  UpdateSubtaskInput,
  SubtaskStatus,
} from '@workopilot/core';

export class SubtasksModule {
  constructor(private core: Core) {}

  async get(id: string): Promise<Subtask | null> {
    return this.core.subtasks.findById(id);
  }

  async listByTaskId(taskId: string): Promise<Subtask[]> {
    return this.core.subtasks.findByTaskId(taskId);
  }

  async create(input: CreateSubtaskInput): Promise<Subtask> {
    return this.core.subtasks.create(input);
  }

  async update(id: string, input: UpdateSubtaskInput): Promise<Subtask> {
    return this.core.subtasks.update(id, input);
  }

  async updateStatus(id: string, status: SubtaskStatus): Promise<Subtask> {
    return this.core.subtasks.updateStatus(id, status);
  }

  async reorder(taskId: string, orderedIds: string[]): Promise<void> {
    return this.core.subtasks.reorder(taskId, orderedIds);
  }

  async delete(id: string): Promise<void> {
    return this.core.subtasks.delete(id);
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    return this.core.subtasks.deleteByTaskId(taskId);
  }
}
