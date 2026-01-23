export const SUBTASK_STATUSES = [
  'pending',
  'in_progress',
  'done',
] as const;

export type SubtaskStatus = (typeof SUBTASK_STATUSES)[number];

export function isValidSubtaskStatus(value: string): value is SubtaskStatus {
  return SUBTASK_STATUSES.includes(value as SubtaskStatus);
}

export function assertSubtaskStatus(value: string): SubtaskStatus {
  if (!isValidSubtaskStatus(value)) {
    throw new Error(`Invalid subtask status: ${value}. Valid values: ${SUBTASK_STATUSES.join(', ')}`);
  }
  return value;
}
