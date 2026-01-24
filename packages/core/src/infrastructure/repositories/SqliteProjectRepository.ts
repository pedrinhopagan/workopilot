import { Kysely, sql } from 'kysely';
import type { Database, ProjectRow } from '../database/schema';
import type { ProjectRepository } from '../../application/ports/ProjectRepository';
import type { Project, CreateProjectInput, UpdateProjectInput, TmuxConfig, ProjectRoute, ProjectStats } from '../../domain/entities/Project';

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

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    description: row.description,
    routes: parseJsonSafe<ProjectRoute[]>(row.routes, []),
    tmux_config: parseJsonSafe<TmuxConfig>(row.tmux_config, { session_name: '', tabs: [] }),
    business_rules: row.business_rules,
    tmux_configured: Boolean(row.tmux_configured),
    display_order: row.display_order,
    color: row.color,
    created_at: row.created_at,
  };
}

export class SqliteProjectRepository implements ProjectRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Project | null> {
    const row = await this.db
      .selectFrom('projects')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? rowToProject(row) : null;
  }

  async findAll(): Promise<Project[]> {
    const rows = await this.db
      .selectFrom('projects')
      .selectAll()
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc')
      .execute();

    return rows.map(rowToProject);
  }

  async getStats(projectId: string): Promise<ProjectStats> {
    const result = await this.db
      .selectFrom('tasks')
      .select([
        sql<number>`COUNT(*)`.as('total_tasks'),
        sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`.as('pending_tasks'),
        sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`.as('in_progress_tasks'),
        sql<number>`SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END)`.as('done_tasks'),
        sql<string | null>`MAX(modified_at)`.as('last_task_modified_at'),
      ])
      .where('project_id', '=', projectId)
      .executeTakeFirst();

    const total = Number(result?.total_tasks ?? 0);
    const done = Number(result?.done_tasks ?? 0);
    const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      project_id: projectId,
      total_tasks: total,
      pending_tasks: Number(result?.pending_tasks ?? 0),
      in_progress_tasks: Number(result?.in_progress_tasks ?? 0),
      done_tasks: done,
      completion_percent: completionPercent,
      last_task_modified_at: result?.last_task_modified_at ?? null,
    };
  }

  async getAllStats(): Promise<ProjectStats[]> {
    const projects = await this.db
      .selectFrom('projects')
      .select('id')
      .execute();

    const result = await this.db
      .selectFrom('tasks')
      .select([
        'project_id',
        sql<number>`COUNT(*)`.as('total_tasks'),
        sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`.as('pending_tasks'),
        sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`.as('in_progress_tasks'),
        sql<number>`SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END)`.as('done_tasks'),
        sql<string | null>`MAX(modified_at)`.as('last_task_modified_at'),
      ])
      .where('project_id', 'is not', null)
      .groupBy('project_id')
      .execute();

    const statsMap = new Map<string, ProjectStats>();
    
    for (const row of result) {
      if (!row.project_id) continue;
      const total = Number(row.total_tasks ?? 0);
      const done = Number(row.done_tasks ?? 0);
      const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

      statsMap.set(row.project_id, {
        project_id: row.project_id,
        total_tasks: total,
        pending_tasks: Number(row.pending_tasks ?? 0),
        in_progress_tasks: Number(row.in_progress_tasks ?? 0),
        done_tasks: done,
        completion_percent: completionPercent,
        last_task_modified_at: row.last_task_modified_at ?? null,
      });
    }

    return projects.map((p) => statsMap.get(p.id) ?? {
      project_id: p.id,
      total_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      done_tasks: 0,
      completion_percent: 0,
      last_task_modified_at: null,
    });
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const id = generateId();

    const maxOrder = await this.db
      .selectFrom('projects')
      .select((eb) => eb.fn.max('display_order').as('max_order'))
      .executeTakeFirst();

    const displayOrder = (maxOrder?.max_order ?? -1) + 1;

    const defaultTmuxConfig: TmuxConfig = {
      session_name: input.name.toLowerCase().replace(/\s+/g, '-'),
      tabs: [],
    };

    await this.db
      .insertInto('projects')
      .values({
        id,
        name: input.name,
        path: input.path,
        description: input.description ?? null,
        routes: JSON.stringify(input.routes ?? []),
        tmux_config: JSON.stringify(input.tmux_config ?? defaultTmuxConfig),
        business_rules: input.business_rules ?? '',
        tmux_configured: 0,
        display_order: displayOrder,
      })
      .execute();

    return this.findById(id) as Promise<Project>;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.path !== undefined) updates.path = input.path;
    if (input.description !== undefined) updates.description = input.description;
    if (input.routes !== undefined) updates.routes = JSON.stringify(input.routes);
    if (input.tmux_config !== undefined) updates.tmux_config = JSON.stringify(input.tmux_config);
    if (input.business_rules !== undefined) updates.business_rules = input.business_rules;
    if (input.tmux_configured !== undefined) updates.tmux_configured = input.tmux_configured ? 1 : 0;
    if (input.display_order !== undefined) updates.display_order = input.display_order;
    if (input.color !== undefined) updates.color = input.color;

    if (Object.keys(updates).length > 0) {
      await this.db
        .updateTable('projects')
        .set(updates)
        .where('id', '=', id)
        .execute();
    }

    return this.findById(id) as Promise<Project>;
  }

  async updateOrder(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .updateTable('projects')
        .set({ display_order: i })
        .where('id', '=', orderedIds[i])
        .execute();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('projects').where('id', '=', id).execute();
  }
}
