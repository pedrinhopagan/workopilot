import { Kysely } from 'kysely';
import type { Database, CategoryRow } from '../database/schema';
import type { CategoryRepository } from '../../application/ports/CategoryRepository';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../../domain/entities/Category';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    display_order: row.display_order,
    created_at: row.created_at,
  };
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private db: Kysely<Database>) {}

  async findById(id: string): Promise<Category | null> {
    const row = await this.db
      .selectFrom('categories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? rowToCategory(row) : null;
  }

  async findAll(): Promise<Category[]> {
    const rows = await this.db
      .selectFrom('categories')
      .selectAll()
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc')
      .execute();

    return rows.map(rowToCategory);
  }

  async findByName(name: string): Promise<Category | null> {
    const row = await this.db
      .selectFrom('categories')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();

    return row ? rowToCategory(row) : null;
  }

  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('categories')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .executeTakeFirst();

    return Number(result?.count ?? 0);
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const id = generateId();

    let displayOrder = input.display_order;
    if (displayOrder === undefined) {
      const maxOrder = await this.db
        .selectFrom('categories')
        .select((eb) => eb.fn.max('display_order').as('max_order'))
        .executeTakeFirst();

      displayOrder = (maxOrder?.max_order ?? -1) + 1;
    }

    await this.db
      .insertInto('categories')
      .values({
        id,
        name: input.name,
        color: input.color ?? null,
        display_order: displayOrder,
      })
      .execute();

    return this.findById(id) as Promise<Category>;
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.color !== undefined) updates.color = input.color;
    if (input.display_order !== undefined) updates.display_order = input.display_order;

    if (Object.keys(updates).length > 0) {
      await this.db
        .updateTable('categories')
        .set(updates)
        .where('id', '=', id)
        .execute();
    }

    return this.findById(id) as Promise<Category>;
  }

  async updateOrder(orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .updateTable('categories')
        .set({ display_order: i })
        .where('id', '=', orderedIds[i])
        .execute();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('categories').where('id', '=', id).execute();
  }
}
