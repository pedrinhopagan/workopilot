/**
 * Task Progress States - Derived from task data for UI display
 * 
 * These are NOT persisted in the database. They are computed from:
 * - task.status (pending | in_progress | done)
 * - subtask completion counts
 * - task description presence
 */

export const TASK_PROGRESS_STATES = [
  'in-execution',
  'ready-to-start',
  'ready-to-review',
  'ai-working',
  'started',
  'idle',
  'done',
] as const;

export type TaskProgressState = (typeof TASK_PROGRESS_STATES)[number];

/**
 * Labels in Portuguese (first letter capitalized)
 */
export const PROGRESS_STATE_LABELS: Record<TaskProgressState, string> = {
  'in-execution': 'Em execucao',
  'ready-to-start': 'Pronta',
  'ready-to-review': 'Aguardando revisao',
  'ai-working': 'IA trabalhando',
  'started': 'Iniciada',
  'idle': 'Pendente',
  'done': 'Concluida',
};

/**
 * Priority rank for ordering (lower = higher priority = more attention needed)
 */
export const PROGRESS_STATE_PRIORITY: Record<TaskProgressState, number> = {
  'in-execution': 1,
  'ready-to-start': 2,
  'ready-to-review': 3,
  'ai-working': 4,
  'started': 5,
  'idle': 6,
  'done': 7,
};

/**
 * Visual styling for each progress state
 */
export const PROGRESS_STATE_COLORS: Record<TaskProgressState, string> = {
  'in-execution': '#61afef',
  'ready-to-start': '#e5c07b',
  'ready-to-review': '#98c379',
  'ai-working': '#c678dd',
  'started': '#d19a66',
  'idle': '#636363',
  'done': '#909d63',
};

/**
 * Badge variants for shadcn/ui Badge component
 */
export const PROGRESS_STATE_BADGE_VARIANTS: Record<
  TaskProgressState,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'muted'
> = {
  'in-execution': 'default',
  'ready-to-start': 'warning',
  'ready-to-review': 'success',
  'ai-working': 'secondary',
  'started': 'outline',
  'idle': 'muted',
  'done': 'muted',
};

/**
 * Container classes for task list items (background + border + hover)
 */
export const PROGRESS_STATE_CONTAINER_CLASSES: Record<TaskProgressState, string> = {
  'in-execution': 'bg-[#61afef]/10 ring-1 ring-[#61afef] hover:bg-[#61afef]/15',
  'ready-to-start': 'bg-[#e5c07b]/10 border-l-4 border-l-[#e5c07b] hover:bg-[#e5c07b]/15',
  'ready-to-review': 'bg-[#98c379]/15 ring-1 ring-[#98c379] hover:bg-[#98c379]/20',
  'ai-working': 'bg-[#c678dd]/10 ring-1 ring-[#c678dd] animate-pulse',
  'started': 'bg-card border-l-4 border-l-[#d19a66] hover:bg-secondary',
  'idle': 'bg-card hover:bg-secondary',
  'done': 'bg-card hover:bg-secondary opacity-60',
};

/**
 * Icon indicators for visual cues
 */
export const PROGRESS_STATE_INDICATORS: Record<TaskProgressState, 'spinner' | 'check' | 'dot' | 'none'> = {
  'in-execution': 'dot',
  'ready-to-start': 'dot',
  'ready-to-review': 'check',
  'ai-working': 'spinner',
  'started': 'dot',
  'idle': 'none',
  'done': 'check',
};

/**
 * Section grouping for task list display
 */
export type ProgressStateSection = 'attention' | 'waiting' | 'setup' | 'done';

export const PROGRESS_STATE_SECTIONS: Record<TaskProgressState, ProgressStateSection> = {
  'in-execution': 'attention',
  'ready-to-start': 'attention',
  'ready-to-review': 'attention',
  'ai-working': 'waiting',
  'started': 'setup',
  'idle': 'setup',
  'done': 'done',
};

export function getProgressStateLabel(state: TaskProgressState): string {
  return PROGRESS_STATE_LABELS[state];
}

export function getProgressStateColor(state: TaskProgressState): string {
  return PROGRESS_STATE_COLORS[state];
}

export function getProgressStateBadgeVariant(state: TaskProgressState) {
  return PROGRESS_STATE_BADGE_VARIANTS[state];
}

export function getProgressStateContainerClass(state: TaskProgressState): string {
  return PROGRESS_STATE_CONTAINER_CLASSES[state];
}

export function getProgressStateIndicator(state: TaskProgressState) {
  return PROGRESS_STATE_INDICATORS[state];
}

export function getProgressStatePriority(state: TaskProgressState): number {
  return PROGRESS_STATE_PRIORITY[state];
}

export function getProgressStateSection(state: TaskProgressState): ProgressStateSection {
  return PROGRESS_STATE_SECTIONS[state];
}

export function getProgressStateFilterOptions() {
  return TASK_PROGRESS_STATES.map((state) => ({
    value: state,
    label: PROGRESS_STATE_LABELS[state],
  }));
}

export function requiresUserAttention(state: TaskProgressState): boolean {
  return PROGRESS_STATE_SECTIONS[state] === 'attention';
}

export function isAiWorking(state: TaskProgressState): boolean {
  return state === 'ai-working';
}

export function isCompleted(state: TaskProgressState): boolean {
  return state === 'done';
}
