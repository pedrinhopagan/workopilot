import type { Setting } from '../../domain/entities/Settings';

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<Setting>;
  delete(key: string): Promise<void>;
  getAll(): Promise<Setting[]>;
}
