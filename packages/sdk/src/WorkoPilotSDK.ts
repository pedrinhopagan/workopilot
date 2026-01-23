import { createCore, getDefaultDbPath } from '@workopilot/core';
import type { Core, CreateCoreOptions } from '@workopilot/core';
import { TasksModule } from './modules/TasksModule';
import { ProjectsModule } from './modules/ProjectsModule';
import { SubtasksModule } from './modules/SubtasksModule';
import { SettingsModule } from './modules/SettingsModule';
import { ExecutionsModule } from './modules/ExecutionsModule';

export interface WorkoPilotSDKOptions {
  /** Custom database path. Defaults to ~/.local/share/workopilot/workopilot.db */
  dbPath?: string;
  /** Run migrations automatically on init. Defaults to true */
  autoMigrate?: boolean;
}

/**
 * WorkoPilot SDK - High-level API for WorkoPilot operations.
 * 
 * Works standalone without Tauri. Designed for:
 * - CLI tools
 * - OpenCode integrations
 * - External automations
 * - Scripts and utilities
 * 
 * @example
 * ```typescript
 * import { WorkoPilotSDK } from '@workopilot/sdk';
 * 
 * const sdk = await WorkoPilotSDK.create();
 * 
 * // Tasks
 * const tasks = await sdk.tasks.list({ status: 'pending' });
 * const task = await sdk.tasks.get('task-id');
 * await sdk.tasks.updateStatus('task-id', 'working');
 * 
 * // Projects
 * const projects = await sdk.projects.list();
 * 
 * // Subtasks
 * await sdk.subtasks.updateStatus('subtask-id', 'done');
 * 
 * // Settings
 * const theme = await sdk.settings.get('theme');
 * await sdk.settings.set('theme', 'dark');
 * 
 * // Cleanup
 * await sdk.close();
 * ```
 */
export class WorkoPilotSDK {
  private core: Core;
  
  public readonly tasks: TasksModule;
  public readonly projects: ProjectsModule;
  public readonly subtasks: SubtasksModule;
  public readonly settings: SettingsModule;
  public readonly executions: ExecutionsModule;

  private constructor(core: Core) {
    this.core = core;
    this.tasks = new TasksModule(core);
    this.projects = new ProjectsModule(core);
    this.subtasks = new SubtasksModule(core);
    this.settings = new SettingsModule(core);
    this.executions = new ExecutionsModule(core);
  }

  /**
   * Create a new SDK instance.
   * 
   * @param options - Configuration options
   * @returns Initialized SDK instance
   */
  static async create(options?: WorkoPilotSDKOptions): Promise<WorkoPilotSDK> {
    const coreOptions: CreateCoreOptions = {
      dbPath: options?.dbPath,
      autoMigrate: options?.autoMigrate,
    };

    const core = await createCore(coreOptions);
    return new WorkoPilotSDK(core);
  }

  /**
   * Get the database path being used.
   */
  get dbPath(): string {
    return this.core.dbPath;
  }

  /**
   * Run database migrations manually.
   * Only needed if autoMigrate was set to false.
   */
  async migrate(): Promise<void> {
    await this.core.migrate();
  }

  /**
   * Close the SDK and release database connection.
   * Should be called when done using the SDK.
   */
  async close(): Promise<void> {
    await this.core.close();
  }

  /**
   * Get the default database path.
   * Useful for displaying to users or debugging.
   */
  static getDefaultDbPath(): string {
    return getDefaultDbPath();
  }
}
