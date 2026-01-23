export const TASK_COMPLEXITIES = [
  'trivial',
  'simple',
  'moderate',
  'complex',
  'epic',
] as const;

export type TaskComplexity = (typeof TASK_COMPLEXITIES)[number];

export function isValidTaskComplexity(value: string): value is TaskComplexity {
  return TASK_COMPLEXITIES.includes(value as TaskComplexity);
}

export function assertTaskComplexity(value: string): TaskComplexity {
  if (!isValidTaskComplexity(value)) {
    throw new Error(`Invalid task complexity: ${value}. Valid values: ${TASK_COMPLEXITIES.join(', ')}`);
  }
  return value;
}
