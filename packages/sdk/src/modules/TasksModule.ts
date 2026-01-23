import type { Core } from '@workopilot/core';
import type {
  Task,
  TaskFull,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskListFilters,
  PaginatedResult,
} from '@workopilot/core';

export class TasksModule {
  constructor(private core: Core) {}

  async get(id: string): Promise<Task | null> {
    return this.core.tasks.findById(id);
  }

  async getFull(id: string): Promise<TaskFull | null> {
    return this.core.tasks.findFullById(id);
  }

  async list(filters?: TaskListFilters): Promise<Task[]> {
    return this.core.tasks.findAll(filters);
  }

  async listFull(filters?: TaskListFilters): Promise<TaskFull[]> {
    return this.core.tasks.findAllFull(filters);
  }

  async listFullPaginated(filters?: TaskListFilters): Promise<PaginatedResult<TaskFull>> {
    return this.core.tasks.findAllFullPaginated(filters);
  }

  async listUrgent(): Promise<Task[]> {
    return this.core.tasks.findUrgent();
  }

  async listActive(): Promise<Task[]> {
    return this.core.tasks.findActive();
  }

  async listForDate(date: string): Promise<Task[]> {
    return this.core.tasks.findForDate(date);
  }

  async listForMonth(year: number, month: number): Promise<Task[]> {
    return this.core.tasks.findForMonth(year, month);
  }

  async listUnscheduled(projectId?: string): Promise<Task[]> {
    return this.core.tasks.findUnscheduled(projectId);
  }

  async create(input: CreateTaskInput): Promise<TaskFull> {
    return this.core.tasks.create(input);
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskFull> {
    return this.core.tasks.update(id, input);
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    modifiedBy: 'user' | 'ai' | 'cli' = 'cli'
  ): Promise<TaskFull> {
    return this.core.tasks.updateStatus(id, status, modifiedBy);
  }

  async schedule(id: string, date: string): Promise<TaskFull> {
    return this.core.tasks.schedule(id, date);
  }

  async unschedule(id: string): Promise<TaskFull> {
    return this.core.tasks.unschedule(id);
  }

  async saveFull(task: TaskFull): Promise<TaskFull> {
    return this.core.tasks.saveFull(task);
  }

  async delete(id: string): Promise<void> {
    return this.core.tasks.delete(id);
  }
}
