import { Kysely } from 'kysely';
import type { Database, SubtaskRow } from '../database/schema';
import type { SubtaskRepository } from '../../application/ports/SubtaskRepository';
import type { Subtask, CreateSubtaskInput, UpdateSubtaskInput } from '../../domain/entities/Subtask';
import type { SubtaskStatus } from '../../domain/value-objects/SubtaskStatus';

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

function rowToSubtask(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    task_id: row.task_id,
    title: row.title,
    status: row.status as SubtaskStatus,
    order: row.order,
    description: row.description,
    acceptance_criteria: parseJsonSafe(row.acceptance_criteria, null),
    technical_notes: row.technical_notes,
    prompt_context: row.prompt_context,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

export class SqliteSubtaskRepository implements SubtaskRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Subtask | null> {
    const row = await this.db
      .selectFrom('subtasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? rowToSubtask(row) : null;
  }

  async findByTaskId(taskId: string): Promise<Subtask[]> {
    const rows = await this.db
      .selectFrom('subtasks')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('order', 'asc')
      .execute();

    return rows.map(rowToSubtask);
  }

  async create(input: CreateSubtaskInput): Promise<Subtask> {
    const id = generateId();
    
    const maxOrder = await this.db
      .selectFrom('subtasks')
      .select((eb) => eb.fn.max('order').as('max_order'))
      .where('task_id', '=', input.task_id)
      .executeTakeFirst();

    const order = input.order ?? ((maxOrder?.max_order ?? -1) + 1);

    await this.db
      .insertInto('subtasks')
      .values({
        id,
        task_id: input.task_id,
        title: input.title,
        status: 'pending',
        order,
        description: input.description ?? null,
        acceptance_criteria: input.acceptance_criteria ? JSON.stringify(input.acceptance_criteria) : null,
        technical_notes: input.technical_notes ?? null,
        prompt_context: input.prompt_context ?? null,
      })
      .execute();

    return this.findById(id) as Promise<Subtask>;
  }

  async update(id: string, input: UpdateSubtaskInput): Promise<Subtask> {
    const updates: Record<string, unknown> = {};

    if (input.title !== undefined) updates.title = input.title;
    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status === 'done') {
        updates.completed_at = new Date().toISOString();
      }
    }
    if (input.description !== undefined) updates.description = input.description;
    if (input.order !== undefined) updates.order = input.order;
    if (input.acceptance_criteria !== undefined) {
      updates.acceptance_criteria = input.acceptance_criteria ? JSON.stringify(input.acceptance_criteria) : null;
    }
    if (input.technical_notes !== undefined) updates.technical_notes = input.technical_notes;
    if (input.prompt_context !== undefined) updates.prompt_context = input.prompt_context;

    if (Object.keys(updates).length > 0) {
      await this.db
        .updateTable('subtasks')
        .set(updates)
        .where('id', '=', id)
        .execute();
    }

    return this.findById(id) as Promise<Subtask>;
  }

  async updateStatus(id: string, status: SubtaskStatus): Promise<Subtask> {
    const updates: Record<string, unknown> = { status };
    
    if (status === 'done') {
      updates.completed_at = new Date().toISOString();
    }

    await this.db
      .updateTable('subtasks')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return this.findById(id) as Promise<Subtask>;
  }

  async reorder(taskId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .updateTable('subtasks')
        .set({ order: i })
        .where('id', '=', orderedIds[i])
        .where('task_id', '=', taskId)
        .execute();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('subtasks').where('id', '=', id).execute();
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    await this.db.deleteFrom('subtasks').where('task_id', '=', taskId).execute();
  }
}
