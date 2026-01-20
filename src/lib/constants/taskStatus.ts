// Centralized task status constants for consistent labels and colors across the app

import type { TaskFull, Subtask } from '$lib/types';

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  AWAITING_REVIEW: 'awaiting_review',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const TASK_STATE = {
  PENDING: 'pending',
  READY_TO_EXECUTE: 'ready_to_execute',
  IN_PROGRESS: 'in_progress',
  AWAITING_REVIEW: 'awaiting_review',
  DONE: 'done',
} as const;

export type TaskState = typeof TASK_STATE[keyof typeof TASK_STATE];

export const STATE_LABELS: Record<TaskState, string> = {
  [TASK_STATE.PENDING]: 'Pendente',
  [TASK_STATE.READY_TO_EXECUTE]: 'Pronta para executar',
  [TASK_STATE.IN_PROGRESS]: 'Em execucao',
  [TASK_STATE.AWAITING_REVIEW]: 'Aguardando revisao',
  [TASK_STATE.DONE]: 'Concluida',
};

export const STATE_COLORS: Record<TaskState, string> = {
  [TASK_STATE.PENDING]: '#e5c07b',
  [TASK_STATE.READY_TO_EXECUTE]: '#909d63',
  [TASK_STATE.IN_PROGRESS]: '#61afef',
  [TASK_STATE.AWAITING_REVIEW]: '#e5c07b',
  [TASK_STATE.DONE]: '#909d63',
};

export const STATUS_LABELS: Record<string, string> = {
  [TASK_STATUS.PENDING]: 'Pendente',
  [TASK_STATUS.IN_PROGRESS]: 'Em progresso',
  [TASK_STATUS.DONE]: 'Concluida',
  [TASK_STATUS.AWAITING_REVIEW]: 'Aguardando revisao',
};

export const STATUS_COLORS: Record<string, string> = {
  [TASK_STATUS.PENDING]: '#ebc17a',
  [TASK_STATUS.IN_PROGRESS]: '#6b9ac4',
  [TASK_STATUS.DONE]: '#909d63',
  [TASK_STATUS.AWAITING_REVIEW]: '#e78a4e',
};

export function getTaskState(taskFull: TaskFull | null | undefined, fallbackStatus?: string): TaskState {
  if (!taskFull) {
    if (fallbackStatus === 'done') return TASK_STATE.DONE;
    if (fallbackStatus === 'awaiting_review') return TASK_STATE.AWAITING_REVIEW;
    if (fallbackStatus === 'in_progress') return TASK_STATE.IN_PROGRESS;
    return TASK_STATE.PENDING;
  }

  if (taskFull.status === 'done') return TASK_STATE.DONE;

  const hasPendingSubtasks = taskFull.subtasks.some((s: Subtask) => s.status === 'pending');
  const hasInProgressSubtasks = taskFull.subtasks.some((s: Subtask) => s.status === 'in_progress');
  const allSubtasksDone = taskFull.subtasks.length > 0 && taskFull.subtasks.every((s: Subtask) => s.status === 'done');

  if (hasInProgressSubtasks) return TASK_STATE.IN_PROGRESS;
  
  if (allSubtasksDone) return TASK_STATE.AWAITING_REVIEW;

  if (hasPendingSubtasks && taskFull.initialized) return TASK_STATE.READY_TO_EXECUTE;

  if (taskFull.initialized && taskFull.subtasks.length === 0) return TASK_STATE.READY_TO_EXECUTE;

  return TASK_STATE.PENDING;
}

export function getStateLabel(state: TaskState): string {
  return STATE_LABELS[state] || state;
}

export function getStateColor(state: TaskState): string {
  return STATE_COLORS[state] || '#636363';
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#636363';
}

// Complexity constants
export const COMPLEXITY = {
  SIMPLE: 'simple',
  MEDIUM: 'medium',
  COMPLEX: 'complex',
} as const;

export type Complexity = typeof COMPLEXITY[keyof typeof COMPLEXITY];

export const COMPLEXITY_LABELS: Record<string, string> = {
  [COMPLEXITY.SIMPLE]: 'Simples',
  [COMPLEXITY.MEDIUM]: 'Media',
  [COMPLEXITY.COMPLEX]: 'Complexa',
};

export const COMPLEXITY_COLORS: Record<string, string> = {
  [COMPLEXITY.SIMPLE]: '#8b7355',
  [COMPLEXITY.MEDIUM]: '#6b9ac4',
  [COMPLEXITY.COMPLEX]: '#bc5653',
};

export function getComplexityLabel(complexity: string | null | undefined): string {
  if (!complexity) return '';
  return COMPLEXITY_LABELS[complexity] || '';
}

export function getComplexityColor(complexity: string | null | undefined): string {
  if (!complexity) return '#636363';
  return COMPLEXITY_COLORS[complexity] || '#636363';
}

// Filter options for dropdowns
export function getStatusFilterOptions() {
  return [
    { value: '', label: 'Todos' },
    { value: TASK_STATUS.PENDING, label: STATUS_LABELS[TASK_STATUS.PENDING] },
    { value: TASK_STATUS.IN_PROGRESS, label: STATUS_LABELS[TASK_STATUS.IN_PROGRESS] },
    { value: TASK_STATUS.DONE, label: STATUS_LABELS[TASK_STATUS.DONE] },
    { value: TASK_STATUS.AWAITING_REVIEW, label: STATUS_LABELS[TASK_STATUS.AWAITING_REVIEW] },
  ];
}
