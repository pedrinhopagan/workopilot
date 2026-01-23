import type { Task, TaskFull, CreateTaskInput, UpdateTaskInput } from '../../domain/entities/Task';
import type { TaskStatus } from '../../domain/value-objects/TaskStatus';
import type { TaskPriority } from '../../domain/value-objects/TaskPriority';
import type { TaskCategory } from '../../domain/value-objects/TaskCategory';

export type TaskSortBy = 'priority' | 'created_at' | 'title' | 'progress_state';
export type SortOrder = 'asc' | 'desc';

export interface TaskListFilters {
  project_id?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  category?: TaskCategory;
  scheduled_date?: string;
  due_date?: string;
  q?: string;
  page?: number;
  perPage?: number;
  sortBy?: TaskSortBy;
  sortOrder?: SortOrder;
  excludeDone?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findFullById(id: string): Promise<TaskFull | null>;
  findAll(filters?: TaskListFilters): Promise<Task[]>;
  findAllFull(filters?: TaskListFilters): Promise<TaskFull[]>;
  findAllFullPaginated(filters?: TaskListFilters): Promise<PaginatedResult<TaskFull>>;
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
