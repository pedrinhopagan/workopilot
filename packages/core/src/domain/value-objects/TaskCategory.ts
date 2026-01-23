export const TASK_CATEGORIES = [
  'feature',
  'bug',
  'refactor',
  'research',
  'documentation',
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export function isValidTaskCategory(value: string): value is TaskCategory {
  return TASK_CATEGORIES.includes(value as TaskCategory);
}

export function assertTaskCategory(value: string): TaskCategory {
  if (!isValidTaskCategory(value)) {
    throw new Error(`Invalid task category: ${value}. Valid values: ${TASK_CATEGORIES.join(', ')}`);
  }
  return value;
}
