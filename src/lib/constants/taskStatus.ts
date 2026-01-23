import type { TaskFull } from "../../types";

export type TaskStatus =
	| "pending"
	| "structuring"
	| "structured"
	| "working"
	| "standby"
	| "ready_to_review"
	| "completed";

export const ALL_TASK_STATUSES: TaskStatus[] = [
	"pending",
	"structuring",
	"structured",
	"working",
	"standby",
	"ready_to_review",
	"completed",
];

export const statusColors: Record<TaskStatus, string> = {
	pending: "#636363",
	structuring: "#c678dd",
	structured: "#e5c07b",
	working: "#61afef",
	standby: "#d19a66",
	ready_to_review: "#98c379",
	completed: "#909d63",
};

export const statusLabels: Record<TaskStatus, string> = {
	pending: "Pendente",
	structuring: "Estruturando",
	structured: "Estruturada",
	working: "Trabalhando",
	standby: "Standby",
	ready_to_review: "Revisão",
	completed: "Concluída",
};

export const statusHighlight: Record<TaskStatus, "none" | "border-l" | "ring"> =
	{
		pending: "none",
		structuring: "border-l",
		structured: "ring",
		working: "border-l",
		standby: "ring",
		ready_to_review: "ring",
		completed: "border-l",
	};

export const statusActor: Record<TaskStatus, "ai" | "user" | null> = {
	pending: "user",
	structuring: "ai",
	structured: "user",
	working: "ai",
	standby: "user",
	ready_to_review: "user",
	completed: null,
};

export function getTaskStatus(status: string): TaskStatus {
	if (ALL_TASK_STATUSES.includes(status as TaskStatus)) {
		return status as TaskStatus;
	}
	if (status === "done") return "completed";
	if (status === "active" || status === "in_progress") return "working";
	return "pending";
}

export function getTaskStatusFromTask(task: TaskFull | null): TaskStatus {
	if (!task) return "pending";
	return getTaskStatus(task.status);
}

export function getStatusColor(status: string): string {
	const taskStatus = getTaskStatus(status);
	return statusColors[taskStatus];
}

export function getTaskStatusColor(task: TaskFull | null): string {
	const taskStatus = getTaskStatusFromTask(task);
	return statusColors[taskStatus];
}

export function getStatusLabel(status: string): string {
	const taskStatus = getTaskStatus(status);
	return statusLabels[taskStatus];
}

export function getTaskStatusLabel(task: TaskFull | null): string {
	const taskStatus = getTaskStatusFromTask(task);
	return statusLabels[taskStatus];
}

export function isUserActionRequired(status: string): boolean {
	const taskStatus = getTaskStatus(status);
	return statusActor[taskStatus] === "user";
}

export function isTaskUserActionRequired(task: TaskFull | null): boolean {
	if (!task) return false;
	return isUserActionRequired(task.status);
}

export function isAIWorking(status: string): boolean {
	const taskStatus = getTaskStatus(status);
	return taskStatus === "structuring" || taskStatus === "working";
}

export function isTaskAIWorking(task: TaskFull | null): boolean {
	if (!task) return false;
	return isAIWorking(task.status);
}

export type HighlightType = "none" | "border-l" | "ring";

export function getStatusHighlight(status: string): HighlightType {
	const taskStatus = getTaskStatus(status);
	return statusHighlight[taskStatus];
}

export function getTaskStatusHighlight(task: TaskFull | null): HighlightType {
	if (!task) return "none";
	return getStatusHighlight(task.status);
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
		medium: "Média",
		complex: "Complexa",
		S: "Simples",
		M: "Média",
		L: "Complexa",
		XL: "Muito Complexa",
	};
	return complexity ? map[complexity] || complexity : "-";
}

export function getStatusFilterOptions() {
	return ALL_TASK_STATUSES.map((status) => ({
		value: status,
		label: statusLabels[status],
	}));
}

export type SuggestedAction =
	| "structure"
	| "execute_all"
	| "execute_subtask"
	| "review"
	| null;

export function getSuggestedAction(task: TaskFull | null): SuggestedAction {
	if (!task) return null;

	const taskStatus = getTaskStatus(task.status);

	if (taskStatus === "completed") return null;
	if (taskStatus === "structuring" || taskStatus === "working") return null;

	if (taskStatus === "pending") return "structure";
	if (taskStatus === "ready_to_review") return "review";

	if (taskStatus === "structured") {
		const subtaskCount = task.subtasks.length;
		if (subtaskCount <= 3) return "execute_all";
		return "execute_subtask";
	}

	if (taskStatus === "standby") return "execute_subtask";

	return null;
}

export const suggestedActionLabels: Record<SuggestedAction & string, string> = {
	structure: "Estruturar",
	execute_all: "Executar Tudo",
	execute_subtask: "Executar Subtask",
	review: "Revisar",
};

export const suggestedActionColors: Record<SuggestedAction & string, string> = {
	structure: "#e5c07b",
	execute_all: "#909d63",
	execute_subtask: "#61afef",
	review: "#e5c07b",
};

export function getSuggestedActionLabel(
	action: SuggestedAction,
): string | null {
	if (!action) return null;
	return suggestedActionLabels[action];
}

export function getSuggestedActionColor(
	action: SuggestedAction,
): string | null {
	if (!action) return null;
	return suggestedActionColors[action];
}

export type DerivedStatus = TaskStatus;
export const getDerivedStatus = getTaskStatus;
export const getTaskDerivedStatus = getTaskStatusFromTask;
export type FullStatus = TaskStatus;
export const getFullStatus = getTaskStatus;
export const getTaskFullStatus = getTaskStatusFromTask;
export const stateLabels = statusLabels;
export const stateColors = statusColors;
export const getTaskState = getTaskStatusFromTask;
export const getStateLabel = getStatusLabel;
export const getStateColor = getStatusColor;
