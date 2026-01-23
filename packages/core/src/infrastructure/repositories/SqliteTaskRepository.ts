import { Kysely, sql } from 'kysely';
import type { Database, TaskRow } from '../database/schema';
import type { TaskRepository, TaskListFilters, PaginatedResult } from '../../application/ports/TaskRepository';
import type { Task, TaskFull, CreateTaskInput, UpdateTaskInput, TaskContext, AIMetadata, TaskTimestamps } from '../../domain/entities/Task';
import type { Subtask } from '../../domain/entities/Subtask';
import type { TaskStatus } from '../../domain/value-objects/TaskStatus';
import type { TaskPriority } from '../../domain/value-objects/TaskPriority';
import type { TaskCategory } from '../../domain/value-objects/TaskCategory';
import type { TaskComplexity } from '../../domain/value-objects/TaskComplexity';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function parseJsonSafe<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    description: row.description,
    priority: row.priority as TaskPriority,
    category: row.category as TaskCategory,
    status: row.status as TaskStatus,
    complexity: row.complexity as TaskComplexity | null,
    due_date: row.due_date,
    scheduled_date: row.scheduled_date,
    created_at: row.created_at as string,
    completed_at: row.completed_at,
  };
}

function rowToTaskFull(row: TaskRow, subtasks: Subtask[]): TaskFull {
  const context: TaskContext = {
    description: row.description,
    business_rules: parseJsonSafe(row.business_rules, []),
    technical_notes: row.technical_notes,
    acceptance_criteria: parseJsonSafe(row.acceptance_criteria, null),
  };

  const aiMetadata: AIMetadata = parseJsonSafe(row.ai_metadata, {
    last_interaction: null,
    last_completed_action: null,
    session_ids: [],
    tokens_used: 0,
    structuring_complete: false,
  });

  const timestamps: TaskTimestamps = {
    created_at: row.created_at as string,
    started_at: row.timestamps_started_at,
    completed_at: row.completed_at,
  };

  return {
    id: row.id,
    title: row.title,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    category: row.category as TaskCategory,
    complexity: row.complexity as TaskComplexity | null,
    context,
    subtasks,
    ai_metadata: aiMetadata,
    timestamps,
    modified_at: row.modified_at,
    project_id: row.project_id,
    due_date: row.due_date,
    scheduled_date: row.scheduled_date,
  };
}

function subtaskRowToSubtask(s: {
  id: string;
  task_id: string;
  title: string;
  status: string;
  order: number;
  description: string | null;
  acceptance_criteria: string | null;
  technical_notes: string | null;
  prompt_context: string | null;
  created_at: string;
  completed_at: string | null;
}): Subtask {
  return {
    id: s.id,
    task_id: s.task_id,
    title: s.title,
    status: s.status as Subtask['status'],
    order: s.order,
    description: s.description,
    acceptance_criteria: parseJsonSafe(s.acceptance_criteria, null),
    technical_notes: s.technical_notes,
    prompt_context: s.prompt_context,
    created_at: s.created_at,
    completed_at: s.completed_at,
  };
}

export class SqliteTaskRepository implements TaskRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Task | null> {
    const row = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? rowToTask(row) : null;
  }

  async findFullById(id: string): Promise<TaskFull | null> {
    const row = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!row) return null;

    const subtaskRows = await this.db
      .selectFrom('subtasks')
      .selectAll()
      .where('task_id', '=', id)
      .orderBy('order', 'asc')
      .execute();

    const subtasks: Subtask[] = subtaskRows.map(subtaskRowToSubtask);
    return rowToTaskFull(row, subtasks);
  }

  async findAll(filters?: TaskListFilters): Promise<Task[]> {
    let query = this.db.selectFrom('tasks').selectAll();

    if (filters?.project_id) {
      query = query.where('project_id', '=', filters.project_id);
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.where('status', 'in', filters.status);
      } else {
        query = query.where('status', '=', filters.status);
      }
    }

    if (filters?.excludeDone) {
      query = query.where('status', '!=', 'done');
    }

    if (filters?.priority) {
      query = query.where('priority', '=', filters.priority);
    }

    if (filters?.category) {
      query = query.where('category', '=', filters.category);
    }

    if (filters?.scheduled_date) {
      query = query.where('scheduled_date', '=', filters.scheduled_date);
    }

    if (filters?.due_date) {
      query = query.where('due_date', '=', filters.due_date);
    }

    if (filters?.q) {
      const searchTerm = `%${filters.q}%`;
      query = query.where((eb) =>
        eb.or([
          eb('title', 'like', searchTerm),
          eb('description', 'like', searchTerm),
        ])
      );
    }

    query = query.orderBy('priority', 'asc').orderBy('created_at', 'desc');

    const rows = await query.execute();
    return rows.map(rowToTask);
  }

  async findAllFull(filters?: TaskListFilters): Promise<TaskFull[]> {
    const result = await this.findAllFullPaginated(filters);
    return result.items;
  }

  async findAllFullPaginated(filters?: TaskListFilters): Promise<PaginatedResult<TaskFull>> {
    const page = filters?.page ?? 1;
    const perPage = Math.min(filters?.perPage ?? 20, 100);
    const offset = (page - 1) * perPage;

    let baseQuery = this.db.selectFrom('tasks');

    if (filters?.project_id) {
      baseQuery = baseQuery.where('project_id', '=', filters.project_id);
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        baseQuery = baseQuery.where('status', 'in', filters.status);
      } else {
        baseQuery = baseQuery.where('status', '=', filters.status);
      }
    }

    if (filters?.excludeDone) {
      baseQuery = baseQuery.where('status', '!=', 'done');
    }

    if (filters?.priority) {
      baseQuery = baseQuery.where('priority', '=', filters.priority);
    }

    if (filters?.category) {
      baseQuery = baseQuery.where('category', '=', filters.category);
    }

    if (filters?.scheduled_date) {
      baseQuery = baseQuery.where('scheduled_date', '=', filters.scheduled_date);
    }

    if (filters?.due_date) {
      baseQuery = baseQuery.where('due_date', '=', filters.due_date);
    }

    if (filters?.q) {
      const searchTerm = `%${filters.q}%`;
      baseQuery = baseQuery.where((eb) =>
        eb.or([
          eb('title', 'like', searchTerm),
          eb('description', 'like', searchTerm),
        ])
      );
    }

    const countResult = await baseQuery
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .executeTakeFirst();
    const total = Number(countResult?.count ?? 0);

    const taskIds = await baseQuery
      .select('tasks.id')
      .execute();

    if (taskIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        perPage,
        totalPages: 0,
      };
    }

    const allTaskIds = taskIds.map((t) => t.id);

    const subtaskAggQuery = await this.db
      .selectFrom('subtasks')
      .select([
        'task_id',
        (eb) => eb.fn.count<number>('id').as('subtask_count'),
        (eb) => sql<number>`SUM(CASE WHEN ${eb.ref('status')} = 'done' THEN 1 ELSE 0 END)`.as('done_count'),
      ])
      .where('task_id', 'in', allTaskIds)
      .groupBy('task_id')
      .execute();

    const subtaskStats = new Map<string, { subtask_count: number; done_count: number }>();
    for (const row of subtaskAggQuery) {
      subtaskStats.set(row.task_id, {
        subtask_count: Number(row.subtask_count),
        done_count: Number(row.done_count),
      });
    }

    let taskQuery = baseQuery.selectAll();

    const sortBy = filters?.sortBy ?? 'progress_state';
    const sortOrder = filters?.sortOrder ?? 'asc';

    if (sortBy === 'progress_state') {
      taskQuery = taskQuery.orderBy(
        sql`
          CASE 
            WHEN status = 'done' THEN 7
            WHEN status = 'in_progress' THEN 4
            ELSE 6
          END
        `,
        'asc'
      );
      taskQuery = taskQuery.orderBy('priority', 'asc');
    } else if (sortBy === 'priority') {
      taskQuery = taskQuery.orderBy('priority', sortOrder);
    } else if (sortBy === 'created_at') {
      taskQuery = taskQuery.orderBy('created_at', sortOrder);
    } else if (sortBy === 'title') {
      taskQuery = taskQuery.orderBy('title', sortOrder);
    }

    taskQuery = taskQuery.limit(perPage).offset(offset);

    const taskRows = await taskQuery.execute();

    if (taskRows.length === 0) {
      return {
        items: [],
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      };
    }

    const pageTaskIds = taskRows.map((t) => t.id);
    const subtaskRows = await this.db
      .selectFrom('subtasks')
      .selectAll()
      .where('task_id', 'in', pageTaskIds)
      .orderBy('order', 'asc')
      .execute();

    const subtasksByTaskId = new Map<string, Subtask[]>();
    for (const s of subtaskRows) {
      const subtask = subtaskRowToSubtask(s);
      const list = subtasksByTaskId.get(s.task_id) || [];
      list.push(subtask);
      subtasksByTaskId.set(s.task_id, list);
    }

    const items = taskRows.map((row) => {
      const subtasks = subtasksByTaskId.get(row.id) || [];
      return rowToTaskFull(row, subtasks);
    });

    const sortedItems = this.sortByProgressState(items, subtaskStats);

    return {
      items: sortedItems,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  private sortByProgressState(
    items: TaskFull[],
    subtaskStats: Map<string, { subtask_count: number; done_count: number }>
  ): TaskFull[] {
    return items.sort((a, b) => {
      const rankA = this.getProgressStateRank(a, subtaskStats);
      const rankB = this.getProgressStateRank(b, subtaskStats);

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.priority - b.priority;
    });
  }

  private getProgressStateRank(
    task: TaskFull,
    subtaskStats: Map<string, { subtask_count: number; done_count: number }>
  ): number {
    if (task.status === 'done') {
      return 7;
    }

    if (task.status === 'in_progress') {
      return 4;
    }

    const stats = subtaskStats.get(task.id) || { subtask_count: 0, done_count: 0 };
    const { subtask_count, done_count } = stats;

    if (subtask_count > 0 && done_count === subtask_count) {
      return 3;
    }

    if (subtask_count > 0 && done_count > 0) {
      return 1;
    }

    if (subtask_count > 0) {
      return 2;
    }

    const hasDescription = task.context?.description && task.context.description.trim().length > 0;
    if (hasDescription) {
      return 5;
    }

    return 6;
  }

  async findUrgent(): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('status', 'not in', ['done'])
      .where('priority', '=', 1)
      .orderBy('due_date', 'asc')
      .execute();

    return rows.map(rowToTask);
  }

  async findActive(): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('status', '=', 'in_progress')
      .orderBy('modified_at', 'desc')
      .execute();

    return rows.map(rowToTask);
  }

  async findForDate(date: string): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('scheduled_date', '=', date)
      .orderBy('priority', 'asc')
      .execute();

    return rows.map(rowToTask);
  }

  async findForMonth(year: number, month: number): Promise<Task[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const rows = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('scheduled_date', '>=', startDate)
      .where('scheduled_date', '<=', endDate)
      .orderBy('scheduled_date', 'asc')
      .execute();

    return rows.map(rowToTask);
  }

  async findUnscheduled(projectId?: string): Promise<Task[]> {
    let query = this.db
      .selectFrom('tasks')
      .selectAll()
      .where('scheduled_date', 'is', null)
      .where('status', 'not in', ['done']);

    if (projectId) {
      query = query.where('project_id', '=', projectId);
    }

    const rows = await query.orderBy('priority', 'asc').execute();
    return rows.map(rowToTask);
  }

  async create(input: CreateTaskInput): Promise<TaskFull> {
    const id = generateId();
    const now = new Date().toISOString();

    const aiMetadata: AIMetadata = {
      last_interaction: null,
      last_completed_action: null,
      session_ids: [],
      tokens_used: 0,
      structuring_complete: false,
    };

    await this.db
      .insertInto('tasks')
      .values({
        id,
        project_id: input.project_id,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 2,
        category: input.category ?? 'feature',
        status: 'pending',
        complexity: input.complexity ?? null,
        due_date: input.due_date ?? null,
        scheduled_date: input.scheduled_date ?? null,
        ai_metadata: JSON.stringify(aiMetadata),
        modified_at: now,
      })
      .execute();

    return this.findFullById(id) as Promise<TaskFull>;
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskFull> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      modified_at: now,
    };

    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.category !== undefined) updates.category = input.category;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === 'done') {
        updates.completed_at = now;
      }
    }
    if (input.complexity !== undefined) updates.complexity = input.complexity;
    if (input.due_date !== undefined) updates.due_date = input.due_date;
    if (input.scheduled_date !== undefined) updates.scheduled_date = input.scheduled_date;

    if (input.context) {
      if (input.context.description !== undefined) updates.description = input.context.description;
      if (input.context.business_rules !== undefined) updates.business_rules = JSON.stringify(input.context.business_rules);
      if (input.context.technical_notes !== undefined) updates.technical_notes = input.context.technical_notes;
      if (input.context.acceptance_criteria !== undefined) updates.acceptance_criteria = JSON.stringify(input.context.acceptance_criteria);
    }

    if (input.ai_metadata) {
      const existing = await this.findFullById(id);
      if (existing) {
        const merged = { ...existing.ai_metadata, ...input.ai_metadata };
        updates.ai_metadata = JSON.stringify(merged);
      }
    }

    await this.db
      .updateTable('tasks')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return this.findFullById(id) as Promise<TaskFull>;
  }

  async updateStatus(id: string, status: TaskStatus, _modifiedBy: 'user' | 'ai' | 'cli'): Promise<TaskFull> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status,
      modified_at: now,
    };

    if (status === 'done') {
      updates.completed_at = now;
    }

    if (status === 'in_progress') {
      const existing = await this.findById(id);
      if (existing && !existing.completed_at) {
        updates.timestamps_started_at = now;
      }
    }

    await this.db
      .updateTable('tasks')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return this.findFullById(id) as Promise<TaskFull>;
  }

  async schedule(id: string, date: string): Promise<TaskFull> {
    const now = new Date().toISOString();

    await this.db
      .updateTable('tasks')
      .set({
        scheduled_date: date,
        modified_at: now,
      })
      .where('id', '=', id)
      .execute();

    return this.findFullById(id) as Promise<TaskFull>;
  }

  async unschedule(id: string): Promise<TaskFull> {
    const now = new Date().toISOString();

    await this.db
      .updateTable('tasks')
      .set({
        scheduled_date: null,
        modified_at: now,
      })
      .where('id', '=', id)
      .execute();

    return this.findFullById(id) as Promise<TaskFull>;
  }

  async saveFull(task: TaskFull): Promise<TaskFull> {
    const now = new Date().toISOString();

    await this.db
      .updateTable('tasks')
      .set({
        title: task.title,
        status: task.status,
        priority: task.priority,
        category: task.category,
        complexity: task.complexity,
        description: task.context.description,
        business_rules: JSON.stringify(task.context.business_rules),
        technical_notes: task.context.technical_notes,
        acceptance_criteria: task.context.acceptance_criteria ? JSON.stringify(task.context.acceptance_criteria) : null,
        ai_metadata: JSON.stringify(task.ai_metadata),
        timestamps_started_at: task.timestamps.started_at,
        completed_at: task.timestamps.completed_at,
        due_date: task.due_date,
        scheduled_date: task.scheduled_date,
        modified_at: now,
      })
      .where('id', '=', task.id)
      .execute();

    await this.db.deleteFrom('subtasks').where('task_id', '=', task.id).execute();

    for (const subtask of task.subtasks) {
      await this.db
        .insertInto('subtasks')
        .values({
          id: subtask.id || generateId(),
          task_id: task.id,
          title: subtask.title,
          status: subtask.status,
          order: subtask.order,
          description: subtask.description,
          acceptance_criteria: subtask.acceptance_criteria ? JSON.stringify(subtask.acceptance_criteria) : null,
          technical_notes: subtask.technical_notes,
          prompt_context: subtask.prompt_context,
          completed_at: subtask.completed_at,
        })
        .execute();
    }

    return this.findFullById(task.id) as Promise<TaskFull>;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('subtasks').where('task_id', '=', id).execute();
    await this.db.deleteFrom('tasks').where('id', '=', id).execute();
  }
}
