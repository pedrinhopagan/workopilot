export const EXECUTION_STATUSES = [
  'running',
  'completed',
  'cancelled',
  'error',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export function isValidExecutionStatus(value: string): value is ExecutionStatus {
  return EXECUTION_STATUSES.includes(value as ExecutionStatus);
}

export function assertExecutionStatus(value: string): ExecutionStatus {
  if (!isValidExecutionStatus(value)) {
    throw new Error(`Invalid execution status: ${value}. Valid values: ${EXECUTION_STATUSES.join(', ')}`);
  }
  return value;
}
