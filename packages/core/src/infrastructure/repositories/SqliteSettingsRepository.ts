import { Kysely } from 'kysely';
import type { Database } from '../database/schema';
import type { SettingsRepository } from '../../application/ports/SettingsRepository';
import type { Setting } from '../../domain/entities/Settings';

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private db: Kysely<Database>) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('settings')
      .select('value')
      .where('key', '=', key)
      .executeTakeFirst();

    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<Setting> {
    const existing = await this.get(key);

    if (existing !== null) {
      await this.db
        .updateTable('settings')
        .set({ value })
        .where('key', '=', key)
        .execute();
    } else {
      await this.db
        .insertInto('settings')
        .values({ key, value })
        .execute();
    }

    return { key, value };
  }

  async delete(key: string): Promise<void> {
    await this.db.deleteFrom('settings').where('key', '=', key).execute();
  }

  async getAll(): Promise<Setting[]> {
    const rows = await this.db
      .selectFrom('settings')
      .selectAll()
      .execute();

    return rows.map((row) => ({ key: row.key, value: row.value }));
  }
}
