import { Kysely, sql } from 'kysely';
import type { Database, TaskExecutionRow, TaskTerminalRow } from '../database/schema';
import type { ExecutionRepository } from '../../application/ports/ExecutionRepository';
import type { TaskExecution, TaskTerminal, StartExecutionInput, UpdateExecutionInput, LinkTerminalInput } from '../../domain/entities/Execution';
import type { ExecutionStatus } from '../../domain/value-objects/ExecutionStatus';
import type { ExecutionType } from '../../domain/value-objects/ExecutionType';

function generateId(): string {
  return crypto.randomUUID();
}

function rowToExecution(row: TaskExecutionRow): TaskExecution {
  return {
    id: row.id,
    task_id: row.task_id,
    subtask_id: row.subtask_id,
    execution_type: row.execution_type as ExecutionType,
    status: row.status as ExecutionStatus,
    current_step: row.current_step,
    total_steps: row.total_steps,
    current_step_description: row.current_step_description,
    waiting_for_input: Boolean(row.waiting_for_input),
    tmux_session: row.tmux_session,
    pid: row.pid,
    last_heartbeat: row.last_heartbeat,
    error_message: row.error_message,
    started_at: row.started_at,
    ended_at: row.ended_at,
  };
}

function rowToTerminal(row: TaskTerminalRow): TaskTerminal {
  return {
    id: row.id,
    task_id: row.task_id,
    tmux_session: row.tmux_session,
    last_subtask_id: row.last_subtask_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SqliteExecutionRepository implements ExecutionRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<TaskExecution | null> {
    const row = await this.db
      .selectFrom('task_executions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? rowToExecution(row) : null;
  }

  async findActiveByTaskId(taskId: string): Promise<TaskExecution | null> {
    const row = await this.db
      .selectFrom('task_executions')
      .selectAll()
      .where('task_id', '=', taskId)
      .where('status', '=', 'running')
      .executeTakeFirst();

    return row ? rowToExecution(row) : null;
  }

  async findAllActive(): Promise<TaskExecution[]> {
    const rows = await this.db
      .selectFrom('task_executions')
      .selectAll()
      .where('status', '=', 'running')
      .execute();

    return rows.map(rowToExecution);
  }

  async start(input: StartExecutionInput): Promise<TaskExecution> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .insertInto('task_executions')
      .values({
        id,
        task_id: input.task_id,
        subtask_id: input.subtask_id ?? null,
        execution_type: input.execution_type,
        status: 'running',
        current_step: 0,
        total_steps: input.total_steps ?? 0,
        current_step_description: null,
        waiting_for_input: 0,
        tmux_session: input.tmux_session ?? null,
        pid: input.pid ?? null,
        last_heartbeat: now,
        error_message: null,
        ended_at: null,
      })
      .execute();

    return this.findById(id) as Promise<TaskExecution>;
  }

  async update(id: string, input: UpdateExecutionInput): Promise<TaskExecution> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      last_heartbeat: now,
    };

    if (input.status !== undefined) {
      updates.status = input.status;
      if (input.status !== 'running') {
        updates.ended_at = now;
      }
    }
    if (input.current_step !== undefined) updates.current_step = input.current_step;
    if (input.total_steps !== undefined) updates.total_steps = input.total_steps;
    if (input.current_step_description !== undefined) updates.current_step_description = input.current_step_description;
    if (input.waiting_for_input !== undefined) updates.waiting_for_input = input.waiting_for_input ? 1 : 0;
    if (input.error_message !== undefined) updates.error_message = input.error_message;

    await this.db
      .updateTable('task_executions')
      .set(updates)
      .where('id', '=', id)
      .execute();

    return this.findById(id) as Promise<TaskExecution>;
  }

  async end(taskId: string, errorMessage?: string | null): Promise<TaskExecution> {
    const now = new Date().toISOString();
    const status: ExecutionStatus = errorMessage ? 'error' : 'completed';

    await this.db
      .updateTable('task_executions')
      .set({
        status,
        ended_at: now,
        last_heartbeat: now,
        error_message: errorMessage ?? null,
      })
      .where('task_id', '=', taskId)
      .where('status', '=', 'running')
      .execute();

    const row = await this.db
      .selectFrom('task_executions')
      .selectAll()
      .where('task_id', '=', taskId)
      .orderBy('ended_at', 'desc')
      .executeTakeFirst();

    return row ? rowToExecution(row) : ({} as TaskExecution);
  }

  async cleanupStale(maxAgeMinutes: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

    const result = await this.db
      .updateTable('task_executions')
      .set({
        status: 'error',
        error_message: 'Execution timed out (stale)',
        ended_at: new Date().toISOString(),
      })
      .where('status', '=', 'running')
      .where('last_heartbeat', '<', cutoff)
      .execute();

    return Number(result[0]?.numUpdatedRows ?? 0);
  }

  async findTerminalByTaskId(taskId: string): Promise<TaskTerminal | null> {
    const row = await this.db
      .selectFrom('task_terminals')
      .selectAll()
      .where('task_id', '=', taskId)
      .executeTakeFirst();

    return row ? rowToTerminal(row) : null;
  }

  async linkTerminal(input: LinkTerminalInput): Promise<TaskTerminal> {
    const now = new Date().toISOString();
    const existing = await this.findTerminalByTaskId(input.task_id);

    if (existing) {
      await this.db
        .updateTable('task_terminals')
        .set({
          tmux_session: input.tmux_session,
          last_subtask_id: input.last_subtask_id ?? null,
          updated_at: now,
        })
        .where('task_id', '=', input.task_id)
        .execute();

      return this.findTerminalByTaskId(input.task_id) as Promise<TaskTerminal>;
    }

    const id = generateId();

    await this.db
      .insertInto('task_terminals')
      .values({
        id,
        task_id: input.task_id,
        tmux_session: input.tmux_session,
        last_subtask_id: input.last_subtask_id ?? null,
        updated_at: now,
      })
      .execute();

    return this.findTerminalByTaskId(input.task_id) as Promise<TaskTerminal>;
  }

  async unlinkTerminal(taskId: string): Promise<void> {
    await this.db.deleteFrom('task_terminals').where('task_id', '=', taskId).execute();
  }

  async updateTerminalSubtask(taskId: string, subtaskId: string | null): Promise<TaskTerminal> {
    const now = new Date().toISOString();

    await this.db
      .updateTable('task_terminals')
      .set({
        last_subtask_id: subtaskId,
        updated_at: now,
      })
      .where('task_id', '=', taskId)
      .execute();

    return this.findTerminalByTaskId(taskId) as Promise<TaskTerminal>;
  }
}
