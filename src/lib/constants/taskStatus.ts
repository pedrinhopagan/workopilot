import type { TaskFull } from "../../types";
import {
	type TaskProgressState,
	TASK_PROGRESS_STATES,
	PROGRESS_STATE_LABELS,
	PROGRESS_STATE_COLORS,
	PROGRESS_STATE_BADGE_VARIANTS,
	PROGRESS_STATE_CONTAINER_CLASSES,
	PROGRESS_STATE_INDICATORS,
	getProgressStateLabel,
	getProgressStateColor,
	getProgressStateBadgeVariant,
	getProgressStateContainerClass,
	getProgressStateIndicator,
	getProgressStateFilterOptions,
	requiresUserAttention,
	isAiWorking,
	isCompleted,
} from "./taskProgressState";

export type { TaskProgressState };
export {
	TASK_PROGRESS_STATES,
	PROGRESS_STATE_LABELS,
	PROGRESS_STATE_COLORS,
	PROGRESS_STATE_BADGE_VARIANTS,
	PROGRESS_STATE_CONTAINER_CLASSES,
	PROGRESS_STATE_INDICATORS,
	getProgressStateLabel,
	getProgressStateColor,
	getProgressStateBadgeVariant,
	getProgressStateContainerClass,
	getProgressStateIndicator,
	getProgressStateFilterOptions,
	requiresUserAttention,
	isAiWorking,
	isCompleted,
};

export function deriveProgressState(task: TaskFull | null): TaskProgressState {
	if (!task) return "idle";

	const rawStatus = task.status?.toLowerCase() ?? "pending";
	const subtasks = task.subtasks ?? [];
	const description = task.context?.description ?? null;

	if (rawStatus === "done") {
		return "done";
	}

	if (rawStatus === "in_progress") {
		return "ai-working";
	}

	const subtaskCount = subtasks.length;
	const doneSubtaskCount = subtasks.filter((s) => s.status === "done").length;

	if (subtaskCount > 0 && doneSubtaskCount === subtaskCount) {
		return "ready-to-review";
	}

	if (subtaskCount > 0 && doneSubtaskCount > 0) {
		return "in-execution";
	}

	if (subtaskCount > 0) {
		return "ready-to-start";
	}

	if (description && description.trim().length > 0) {
		return "started";
	}

	return "idle";
}

export function getTaskProgressState(task: TaskFull | null): TaskProgressState {
	return deriveProgressState(task);
}

export function getTaskProgressStateLabel(task: TaskFull | null): string {
	return getProgressStateLabel(deriveProgressState(task));
}

export function getTaskProgressStateColor(task: TaskFull | null): string {
	return getProgressStateColor(deriveProgressState(task));
}

export function getTaskProgressStateBadgeVariant(task: TaskFull | null) {
	return getProgressStateBadgeVariant(deriveProgressState(task));
}

export function getTaskProgressStateContainerClass(task: TaskFull | null): string {
	return getProgressStateContainerClass(deriveProgressState(task));
}

export function getTaskProgressStateIndicator(task: TaskFull | null) {
	return getProgressStateIndicator(deriveProgressState(task));
}

export function isTaskAwaitingUserAction(task: TaskFull | null): boolean {
	return requiresUserAttention(deriveProgressState(task));
}

export function isTaskAiWorking(task: TaskFull | null): boolean {
	return isAiWorking(deriveProgressState(task));
}

export function isTaskCompleted(task: TaskFull | null): boolean {
	return isCompleted(deriveProgressState(task));
}

export type SuggestedAction =
	| "structure"
	| "execute_all"
	| "execute_subtask"
	| "review"
	| "focus_terminal"
	| null;

export function getSuggestedAction(task: TaskFull | null): SuggestedAction {
	if (!task) return null;

	const progressState = deriveProgressState(task);

	switch (progressState) {
		case "idle":
		case "started":
			return "structure";

		case "ai-working":
			return "focus_terminal";

		case "ready-to-start": {
			const subtaskCount = task.subtasks?.length ?? 0;
			return subtaskCount <= 3 ? "execute_all" : "execute_subtask";
		}

		case "in-execution":
			return "execute_subtask";

		case "ready-to-review":
			return "review";

		case "done":
			return null;

		default:
			return null;
	}
}

export const SUGGESTED_ACTION_LABELS: Record<Exclude<SuggestedAction, null>, string> = {
	structure: "Estruturar",
	execute_all: "Executar tudo",
	execute_subtask: "Executar subtask",
	review: "Revisar",
	focus_terminal: "Ver terminal",
};

/**
 * Suggested action colors derived from progress state colors.
 * Each action inherits the color of the progress state that suggests it.
 * 
 * Mapping: idle/started → structure, ready-to-start → execute_all,
 * in-execution → execute_subtask, ai-working → focus_terminal, ready-to-review → review
 */
export const SUGGESTED_ACTION_COLORS: Record<Exclude<SuggestedAction, null>, string> = {
	structure: PROGRESS_STATE_COLORS['started'],
	execute_all: PROGRESS_STATE_COLORS['ready-to-start'],
	execute_subtask: PROGRESS_STATE_COLORS['in-execution'],
	review: PROGRESS_STATE_COLORS['ready-to-review'],
	focus_terminal: PROGRESS_STATE_COLORS['ai-working'],
};

export function getSuggestedActionLabel(action: SuggestedAction): string | null {
	if (!action) return null;
	return SUGGESTED_ACTION_LABELS[action];
}

export function getSuggestedActionColor(action: SuggestedAction): string | null {
	if (!action) return null;
	return SUGGESTED_ACTION_COLORS[action];
}

export function getComplexityColor(complexity: string | null): string {
	const map: Record<string, string> = {
		simple: "text-[#909d63]",
		medium: "text-[#ebc17a]",
		complex: "text-[#bc5653]",
		S: "text-[#909d63]",
		M: "text-[#ebc17a]",
		L: "text-[#bc5653]",
		XL: "text-[#bc5653] font-bold",
	};
	return complexity ? map[complexity] || "text-[#636363]" : "text-[#636363]";
}

export function getComplexityLabel(complexity: string | null): string {
	const map: Record<string, string> = {
		simple: "Simples",
		medium: "Media",
		complex: "Complexa",
		S: "Simples",
		M: "Media",
		L: "Complexa",
		XL: "Muito complexa",
	};
	return complexity ? map[complexity] || complexity : "-";
}

/**
 * Backend task status values (persisted in DB)
 * @deprecated Use TaskProgressState for UI display
 */
export type TaskStatus = "pending" | "in_progress" | "done";

export const ALL_TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "done"];

export const statusLabels: Record<TaskStatus, string> = {
	pending: "Pendente",
	in_progress: "Em progresso",
	done: "Concluida",
};

export const statusColors: Record<TaskStatus, string> = {
	pending: "#7a7a7a",
	in_progress: "#c2722a",
	done: "#4a4a4a",
};

/**
 * For legacy compatibility - maps task to a TaskStatus
 * @deprecated Use deriveProgressState for accurate UI state
 */
export function getTaskStatusFromTask(task: TaskFull | null): TaskStatus {
	if (!task) return "pending";
	const status = task.status?.toLowerCase();
	if (status === "done") return "done";
	if (status === "in_progress") return "in_progress";
	return "pending";
}

/** @deprecated Use getSuggestedAction instead */
export function getSuggestedActionByProgress(task: TaskFull | null): SuggestedAction {
	return getSuggestedAction(task);
}

export function getTaskProgressStateHighlight(task: TaskFull | null): "pulse" | "none" {
	const state = deriveProgressState(task);
	return state === "ai-working" ? "pulse" : "none";
}
