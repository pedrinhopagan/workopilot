import type { Core } from '@workopilot/core';
import type { Setting } from '@workopilot/core';

export class SettingsModule {
  constructor(private core: Core) {}

  async get(key: string): Promise<string | null> {
    return this.core.settings.get(key);
  }

  async set(key: string, value: string): Promise<Setting> {
    return this.core.settings.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.core.settings.delete(key);
  }

  async getAll(): Promise<Setting[]> {
    return this.core.settings.getAll();
  }
}
