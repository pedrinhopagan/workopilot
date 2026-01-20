// Centralized task status constants for consistent labels and colors across the app

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  AWAITING_REVIEW: 'awaiting_review',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

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
