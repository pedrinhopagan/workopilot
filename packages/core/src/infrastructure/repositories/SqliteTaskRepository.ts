import { Kysely } from 'kysely';
import type { Database, TaskRow, SubtaskRow } from '../database/schema';
import type { TaskRepository, TaskListFilters } from '../../application/ports/TaskRepository';
import type { Task, TaskFull, CreateTaskInput, UpdateTaskInput, TaskContext, AIMetadata, TaskTimestamps } from '../../domain/entities/Task';
import type { Subtask } from '../../domain/entities/Subtask';
import type { TaskStatus } from '../../domain/value-objects/TaskStatus';
import type { TaskPriority } from '../../domain/value-objects/TaskPriority';
import type { TaskCategory } from '../../domain/value-objects/TaskCategory';
import type { TaskComplexity } from '../../domain/value-objects/TaskComplexity';

function generateId(): string {
  return crypto.randomUUID();
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
    description: row.context_description,
    business_rules: parseJsonSafe(row.context_business_rules, []),
    technical_notes: row.context_technical_notes,
    acceptance_criteria: parseJsonSafe(row.context_acceptance_criteria, null),
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
    schema_version: row.schema_version ?? 2,
    initialized: Boolean(row.initialized),
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
    modified_by: row.modified_by as 'user' | 'ai' | 'cli' | null,
    project_id: row.project_id,
    due_date: row.due_date,
    scheduled_date: row.scheduled_date,
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

    const subtasks: Subtask[] = subtaskRows.map((s) => ({
      id: s.id,
      task_id: s.task_id,
      title: s.title,
      status: s.status as Subtask['status'],
      order: s.order,
      description: s.description,
      acceptance_criteria: parseJsonSafe(s.acceptance_criteria, null),
      technical_notes: s.technical_notes,
      prompt_context: s.prompt_context,
      created_at: s.created_at as string,
      completed_at: s.completed_at,
    }));

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

    if (filters?.scheduled_date) {
      query = query.where('scheduled_date', '=', filters.scheduled_date);
    }

    if (filters?.due_date) {
      query = query.where('due_date', '=', filters.due_date);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.orderBy('priority', 'asc').orderBy('created_at', 'desc');

    const rows = await query.execute();
    return rows.map(rowToTask);
  }

  async findUrgent(): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('status', 'not in', ['completed'])
      .where('priority', '=', 1)
      .orderBy('due_date', 'asc')
      .execute();

    return rows.map(rowToTask);
  }

  async findActive(): Promise<Task[]> {
    const rows = await this.db
      .selectFrom('tasks')
      .selectAll()
      .where('status', 'in', ['working', 'structuring'])
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
      .where('status', 'not in', ['completed']);

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
        initialized: 1,
        schema_version: 2,
        ai_metadata: JSON.stringify(aiMetadata),
        modified_at: now,
        modified_by: 'user',
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
      if (input.status === 'completed') {
        updates.completed_at = now;
      }
    }
    if (input.complexity !== undefined) updates.complexity = input.complexity;
    if (input.due_date !== undefined) updates.due_date = input.due_date;
    if (input.scheduled_date !== undefined) updates.scheduled_date = input.scheduled_date;
    if (input.modified_by !== undefined) updates.modified_by = input.modified_by;

    if (input.context) {
      if (input.context.description !== undefined) updates.context_description = input.context.description;
      if (input.context.business_rules !== undefined) updates.context_business_rules = JSON.stringify(input.context.business_rules);
      if (input.context.technical_notes !== undefined) updates.context_technical_notes = input.context.technical_notes;
      if (input.context.acceptance_criteria !== undefined) updates.context_acceptance_criteria = JSON.stringify(input.context.acceptance_criteria);
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

  async updateStatus(id: string, status: TaskStatus, modifiedBy: 'user' | 'ai' | 'cli'): Promise<TaskFull> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status,
      modified_at: now,
      modified_by: modifiedBy,
    };

    if (status === 'completed') {
      updates.completed_at = now;
    }

    if (status === 'working' || status === 'structuring') {
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
        context_description: task.context.description,
        context_business_rules: JSON.stringify(task.context.business_rules),
        context_technical_notes: task.context.technical_notes,
        context_acceptance_criteria: task.context.acceptance_criteria ? JSON.stringify(task.context.acceptance_criteria) : null,
        ai_metadata: JSON.stringify(task.ai_metadata),
        timestamps_started_at: task.timestamps.started_at,
        completed_at: task.timestamps.completed_at,
        due_date: task.due_date,
        scheduled_date: task.scheduled_date,
        modified_at: now,
        modified_by: task.modified_by,
        initialized: task.initialized ? 1 : 0,
        schema_version: task.schema_version,
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
