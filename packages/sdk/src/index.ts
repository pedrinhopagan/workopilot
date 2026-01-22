export { WorkoPilotSDK } from './WorkoPilotSDK';
export type { WorkoPilotSDKOptions } from './WorkoPilotSDK';

export { TasksModule } from './modules/TasksModule';
export { ProjectsModule } from './modules/ProjectsModule';
export { SubtasksModule } from './modules/SubtasksModule';
export { SettingsModule } from './modules/SettingsModule';
export { ExecutionsModule } from './modules/ExecutionsModule';

export type {
  Task,
  TaskFull,
  CreateTaskInput,
  UpdateTaskInput,
  TaskContext,
  AIMetadata,
  TaskTimestamps,
} from '@workopilot/core';

export type {
  Subtask,
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from '@workopilot/core';

export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectRoute,
  TmuxConfig,
  TmuxTab,
} from '@workopilot/core';

export type { Setting } from '@workopilot/core';

export type {
  TaskExecution,
  TaskTerminal,
  StartExecutionInput,
  UpdateExecutionInput,
  LinkTerminalInput,
} from '@workopilot/core';

export type {
  TaskStatus,
  SubtaskStatus,
  TaskPriority,
  TaskCategory,
  TaskComplexity,
  ExecutionStatus,
  ExecutionType,
} from '@workopilot/core';

export {
  TASK_STATUSES,
  isValidTaskStatus,
  assertTaskStatus,
} from '@workopilot/core';

export {
  SUBTASK_STATUSES,
  isValidSubtaskStatus,
  assertSubtaskStatus,
} from '@workopilot/core';

export type { TaskListFilters } from '@workopilot/core';
