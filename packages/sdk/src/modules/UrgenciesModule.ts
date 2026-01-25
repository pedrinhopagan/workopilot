import type { Core } from '@workopilot/core';
import type { Urgency, CreateUrgencyInput, UpdateUrgencyInput } from '@workopilot/core';

const MAX_URGENCIES = 10;

export class UrgenciesModule {
  constructor(private core: Core) {}

  async get(id: string): Promise<Urgency | null> {
    return this.core.urgencies.findById(id);
  }

  async list(): Promise<Urgency[]> {
    return this.core.urgencies.findAll();
  }

  async getByName(name: string): Promise<Urgency | null> {
    return this.core.urgencies.findByName(name);
  }

  async getByLevel(level: number): Promise<Urgency | null> {
    return this.core.urgencies.findByLevel(level);
  }

  async count(): Promise<number> {
    return this.core.urgencies.count();
  }

  async create(input: CreateUrgencyInput): Promise<Urgency> {
    const currentCount = await this.core.urgencies.count();
    if (currentCount >= MAX_URGENCIES) {
      throw new Error(`Maximum of ${MAX_URGENCIES} urgencies allowed`);
    }
    return this.core.urgencies.create(input);
  }

  async update(id: string, input: UpdateUrgencyInput): Promise<Urgency> {
    return this.core.urgencies.update(id, input);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    return this.core.urgencies.updateOrder(orderedIds);
  }

  async delete(id: string): Promise<void> {
    return this.core.urgencies.delete(id);
  }

  async migrateAndDelete(sourceId: string, targetId: string): Promise<void> {
    const sourceUrgency = await this.core.urgencies.findById(sourceId);
    const targetUrgency = await this.core.urgencies.findById(targetId);

    if (!sourceUrgency || !targetUrgency) {
      throw new Error('Source or target urgency not found');
    }

    await this.core.db
      .updateTable('tasks')
      .set({ priority: targetUrgency.level })
      .where('priority', '=', sourceUrgency.level)
      .execute();

    await this.core.urgencies.delete(sourceId);
  }

  async hasAssociatedTasks(urgencyId: string): Promise<boolean> {
    const urgency = await this.core.urgencies.findById(urgencyId);
    if (!urgency) return false;

    const result = await this.core.db
      .selectFrom('tasks')
      .select((eb) => eb.fn.count<number>('id').as('count'))
      .where('priority', '=', urgency.level)
      .executeTakeFirst();

    return Number(result?.count ?? 0) > 0;
  }
}
