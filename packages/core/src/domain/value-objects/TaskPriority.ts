export const TASK_PRIORITIES = [1, 2, 3] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isValidTaskPriority(value: number): value is TaskPriority {
  return TASK_PRIORITIES.includes(value as TaskPriority);
}

export function assertTaskPriority(value: number): TaskPriority {
  if (!isValidTaskPriority(value)) {
    throw new Error(`Invalid task priority: ${value}. Valid values: ${TASK_PRIORITIES.join(', ')}`);
  }
  return value;
}

export function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case 1: return 'High';
    case 2: return 'Medium';
    case 3: return 'Low';
  }
}
