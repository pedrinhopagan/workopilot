import { router } from './trpc';
import { systemRouter } from './routers/system';
import { projectsRouter } from './routers/projects';
import { tasksRouter } from './routers/tasks';
import { subtasksRouter } from './routers/subtasks';
import { settingsRouter } from './routers/settings';
import { executionsRouter } from './routers/executions';

export const appRouter = router({
  system: systemRouter,
  projects: projectsRouter,
  tasks: tasksRouter,
  subtasks: subtasksRouter,
  settings: settingsRouter,
  executions: executionsRouter,
});

export type AppRouter = typeof appRouter;
