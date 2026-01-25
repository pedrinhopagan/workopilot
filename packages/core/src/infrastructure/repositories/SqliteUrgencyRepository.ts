import { Kysely } from 'kysely';
import type { Database, UrgencyRow } from '../database/schema';
import type { UrgencyRepository } from '../../application/ports/UrgencyRepository';
import type { Urgency, CreateUrgencyInput, UpdateUrgencyInput } from '../../domain/entities/Urgency';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function rowToUrgency(row: UrgencyRow): Urgency {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    color: row.color,
    display_order: row.display_order,
    created_at: row.created_at,
  };
}

export class SqliteUrgencyRepository implements UrgencyRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Urgency | null> {
    const row = await this.db
      .selectFrom('urgencies')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? rowToUrgency(row) : null;
  }

  async findAll(): Promise<Urgency[]> {
    const rows = await this.db
      .selectFrom('urgencies')
      .selectAll()
      .orderBy('display_order', 'asc')
      .orderBy('level', 'asc')
      .execute();

    return rows.map(rowToUrgency);
  }

  async findByName(name: string): Promise<Urgency | null> {
    const row = await this.db
      .selectFrom('urgencies')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();

    return row ? rowToUrgency(row) : null;
  }

  async findByLevel(level: number): Promise<Urgency | null> {
    const row = await this.db
      .selectFrom('urgencies')
      .selectAll()
      .where('level', '=', level)
      .executeTakeFirst();

    return row ? rowToUrgency(row) : null;
  }

  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('urgencies')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }

  async create(input: CreateUrgencyInput): Promise<Urgency> {
    const id = generateId();

    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await this.db
        .selectFrom('urgencies')
        .select((eb) => eb.fn.max('display_order').as('max_order'))
        .executeTakeFirst();

      displayOrder = (maxOrder?.max_order ?? -1) + 1;
    }

    await this.db
      .insertInto('urgencies')
      .values({
        id,
        name: input.name,
        level: input.level,
        color: input.color,
        display_order: displayOrder,
      })
      .execute();

    return this.findById(id) as Promise<Urgency>;
  }

  async update(id: string, input: UpdateUrgencyInput): Promise<Urgency> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.level !== undefined) updates.level = input.level;
    if (input.color !== undefined) updates.color = input.color;
    if (input.display_order !== undefined) updates.display_order = input.display_order;

    if (Object.keys(updates).length > 0) {
      await this.db
        .updateTable('urgencies')
        .set(updates)
        .where('id', '=', id)
        .execute();
    }

    return this.findById(id) as Promise<Urgency>;
  }

  async updateOrder(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .updateTable('urgencies')
        .set({ display_order: i })
        .where('id', '=', orderedIds[i])
        .execute();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('urgencies').where('id', '=', id).execute();
  }
}
