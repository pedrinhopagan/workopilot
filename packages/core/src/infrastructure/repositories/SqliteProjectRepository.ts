import { Kysely } from 'kysely';
import type { Database, ProjectRow } from '../database/schema';
import type { ProjectRepository } from '../../application/ports/ProjectRepository';
import type { Project, CreateProjectInput, UpdateProjectInput, TmuxConfig, ProjectRoute } from '../../domain/entities/Project';

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
