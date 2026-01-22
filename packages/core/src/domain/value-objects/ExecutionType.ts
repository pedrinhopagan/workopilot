export const EXECUTION_TYPES = [
  'full',
  'subtask',
] as const;

export type ExecutionType = (typeof EXECUTION_TYPES)[number];

export function isValidExecutionType(value: string): value is ExecutionType {
  return EXECUTION_TYPES.includes(value as ExecutionType);
}

export function assertExecutionType(value: string): ExecutionType {
  if (!isValidExecutionType(value)) {
    throw new Error(`Invalid execution type: ${value}. Valid values: ${EXECUTION_TYPES.join(', ')}`);
  }
  return value;
}
