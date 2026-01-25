import type { Core } from '@workopilot/core';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@workopilot/core';

const MAX_CATEGORIES = 10;

export class CategoriesModule {
  constructor(private core: Core) {}

  async get(id: string): Promise<Category | null> {
    return this.core.categories.findById(id);
  }

  async list(): Promise<Category[]> {
    return this.core.categories.findAll();
  }

  async getByName(name: string): Promise<Category | null> {
    return this.core.categories.findByName(name);
  }

  async count(): Promise<number> {
    return this.core.categories.count();
  }

  async create(input: CreateCategoryInput): Promise<Category> {
    const currentCount = await this.core.categories.count();
    if (currentCount >= MAX_CATEGORIES) {
      throw new Error(`Maximum of ${MAX_CATEGORIES} categories allowed`);
    }
    return this.core.categories.create(input);
  }

  async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    return this.core.categories.update(id, input);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    return this.core.categories.updateOrder(orderedIds);
  }

  async delete(id: string): Promise<void> {
    return this.core.categories.delete(id);
  }

  async migrateAndDelete(sourceId: string, targetId: string): Promise<void> {
    await this.core.db
      .updateTable('tasks')
      .set({ category: targetId })
      .where('category', '=', sourceId)
      .execute();

    await this.core.categories.delete(sourceId);
  }

  async hasAssociatedTasks(categoryId: string): Promise<boolean> {
    const result = await this.core.db
      .selectFrom('tasks')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('category', '=', categoryId)
      .executeTakeFirst();

    return Number(result?.count ?? 0) > 0;
  }
}
