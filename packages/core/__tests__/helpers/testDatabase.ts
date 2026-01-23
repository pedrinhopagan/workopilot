import { createCore } from '../../src/infrastructure';
import type { Core } from '../../src/infrastructure';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

export interface TestDatabase {
  core: Core;
  cleanup: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const tempDir = mkdtempSync(join(tmpdir(), 'workopilot-test-'));
  const dbPath = join(tempDir, 'test.db');

  const core = await createCore({
    dbPath,
    autoMigrate: true,
  });

  return {
    core,
    cleanup: async () => {
      await core.close();
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Cleanup errors can be ignored in tests
      }
    },
  };
}

export async function seedTestData(core: Core): Promise<{
  projectId: string;
  taskId: string;
  subtaskId: string;
}> {
  const project = await core.projects.create({
    name: 'Test Project',
    path: '/tmp/test-project',
    description: 'A test project for integration tests',
  });

  const task = await core.tasks.create({
    project_id: project.id,
    title: 'Test Task',
    description: 'Test task description',
    priority: 1,
    category: 'feature',
  });

  const subtask = await core.subtasks.create({
    task_id: task.id,
    title: 'Test Subtask',
    description: 'Test subtask description',
  });

  return { projectId: project.id, taskId: task.id, subtaskId: subtask.id };
}
