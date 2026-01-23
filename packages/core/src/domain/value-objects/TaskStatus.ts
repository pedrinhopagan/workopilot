export const TASK_STATUSES = [
  'pending',
  'in_progress',
  'done',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isValidTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function assertTaskStatus(value: string): TaskStatus {
  if (!isValidTaskStatus(value)) {
    throw new Error(`Invalid task status: ${value}. Valid values: ${TASK_STATUSES.join(', ')}`);
  }
  return value;
}

export function canTransition(_from: TaskStatus, _to: TaskStatus): boolean {
  return true;
}
