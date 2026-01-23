import type { Task, TaskFull, CreateTaskInput, UpdateTaskInput } from '../../domain/entities/Task';
import type { TaskStatus } from '../../domain/value-objects/TaskStatus';

export interface TaskListFilters {
  project_id?: string;
  status?: TaskStatus | TaskStatus[];
  scheduled_date?: string;
  due_date?: string;
  limit?: number;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findFullById(id: string): Promise<TaskFull | null>;
  findAll(filters?: TaskListFilters): Promise<Task[]>;
  findUrgent(): Promise<Task[]>;
  findActive(): Promise<Task[]>;
  findForDate(date: string): Promise<Task[]>;
  findForMonth(year: number, month: number): Promise<Task[]>;
  findUnscheduled(projectId?: string): Promise<Task[]>;
  create(input: CreateTaskInput): Promise<TaskFull>;
  update(id: string, input: UpdateTaskInput): Promise<TaskFull>;
  updateStatus(id: string, status: TaskStatus, modifiedBy: 'user' | 'ai' | 'cli'): Promise<TaskFull>;
  schedule(id: string, date: string): Promise<TaskFull>;
  unschedule(id: string): Promise<TaskFull>;
  saveFull(task: TaskFull): Promise<TaskFull>;
  delete(id: string): Promise<void>;
}
