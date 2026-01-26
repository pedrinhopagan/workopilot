import type { LucideIcon } from "lucide-react";
import {
	FileText,
	Rocket,
	Target,
	FileCheck,
	GitCommitHorizontal,
	Monitor,
} from "lucide-react";
import type { TaskFull } from "../../types";
import type { TaskStatus } from "./taskStatus";
import { deriveProgressState } from "./taskStatus";
import { PROGRESS_STATE_COLORS } from "./taskProgressState";

// ─── Action Definition ───────────────────────────────────────────────

export interface ActionDefinition {
	id: ActionId;
	label: string;
	icon: LucideIcon;
	skill: string;
	color: string;
	suggestedWhen: (task: TaskFull) => boolean;
	generatePrompt: (task: TaskFull, subtaskId?: string) => string;
	beforeExecute?: { setStatus?: TaskStatus };
	afterExecute?: { setStatus?: TaskStatus };
	requiresSubtaskSelect?: boolean;
}

export type ActionId =
	| "structure"
	| "execute_all"
	| "execute_subtask"
	| "review"
	| "commit"
	| "focus_terminal";

// ─── Action Colors ───────────────────────────────────────────────────

const ACTION_COLORS = {
	structure: PROGRESS_STATE_COLORS["started"],
	execute_all: PROGRESS_STATE_COLORS["ready-to-start"],
	execute_subtask: PROGRESS_STATE_COLORS["in-execution"],
	review: PROGRESS_STATE_COLORS["ready-to-review"],
	commit: PROGRESS_STATE_COLORS["ready-to-commit"],
	focus_terminal: PROGRESS_STATE_COLORS["ai-working"],
} as const;

// ─── Action Definitions ──────────────────────────────────────────────

const focus_terminal: ActionDefinition = {
	id: "focus_terminal",
	label: "Ver terminal",
	icon: Monitor,
	skill: "",
	color: ACTION_COLORS.focus_terminal,
	suggestedWhen: (task) => {
		const state = deriveProgressState(task);
		return state === "ai-working";
	},
	generatePrompt: () => "",
};

const commit: ActionDefinition = {
	id: "commit",
	label: "Commit",
	icon: GitCommitHorizontal,
	skill: "workopilot-commit",
	color: ACTION_COLORS.commit,
	suggestedWhen: (task) => {
		const subtasks = task.subtasks ?? [];
		const subtaskCount = subtasks.length;
		const doneCount = subtasks.filter((s) => s.status === "done").length;
		const allDone = subtaskCount > 0 && doneCount === subtaskCount;
		const lastAction = task.ai_metadata?.last_completed_action;
		return (
			allDone &&
			lastAction === "review" &&
			task.status !== "done"
		);
	},
	generatePrompt: (task) =>
		`Commit: ${task.title}, utilize a skill workopilot-commit para commitar as mudanças da task de id: ${task.id}`,
};

const review: ActionDefinition = {
	id: "review",
	label: "Revisar",
	icon: FileCheck,
	skill: "workopilot-review",
	color: ACTION_COLORS.review,
	suggestedWhen: (task) => {
		const state = deriveProgressState(task);
		return state === "ready-to-review";
	},
	generatePrompt: (task) =>
		`Revisar: ${task.title}, utilize a skill workopilot-review para revisar a task de id: ${task.id}`,
};

const execute_subtask: ActionDefinition = {
	id: "execute_subtask",
	label: "Executar Subtask",
	icon: Target,
	skill: "workopilot-execute-subtask",
	color: ACTION_COLORS.execute_subtask,
	suggestedWhen: (task) => {
		const state = deriveProgressState(task);
		if (state === "in-execution") return true;
		if (state === "ready-to-start") {
			const subtaskCount = task.subtasks?.length ?? 0;
			return subtaskCount > 3;
		}
		return false;
	},
	generatePrompt: (task, subtaskId?: string) => {
		const subtask = task.subtasks?.find((s) => s.id === subtaskId);
		const subtaskTitle = subtask?.title ?? "subtask";
		return `Executar subtask: ${subtaskTitle} (task: ${task.title}), utilize a skill workopilot-execute-subtask para executar a subtask ${subtaskId} da task ${task.id}`;
	},
	beforeExecute: { setStatus: "in_progress" },
	requiresSubtaskSelect: true,
};

const execute_all: ActionDefinition = {
	id: "execute_all",
	label: "Executar Tudo",
	icon: Rocket,
	skill: "workopilot-execute-all",
	color: ACTION_COLORS.execute_all,
	suggestedWhen: (task) => {
		const state = deriveProgressState(task);
		if (state !== "ready-to-start") return false;
		const subtaskCount = task.subtasks?.length ?? 0;
		return subtaskCount <= 3;
	},
	generatePrompt: (task) =>
		`Executar: ${task.title}, utilize a skill workopilot-execute-all para executar a task de id: ${task.id}`,
	beforeExecute: { setStatus: "in_progress" },
};

const structure: ActionDefinition = {
	id: "structure",
	label: "Estruturar",
	icon: FileText,
	skill: "workopilot-structure",
	color: ACTION_COLORS.structure,
	suggestedWhen: (task) => {
		const state = deriveProgressState(task);
		return state === "idle" || state === "started";
	},
	generatePrompt: (task) =>
		`Estruturar: ${task.title}, utilize a skill workopilot-structure para estruturar a task de id: ${task.id}`,
	beforeExecute: { setStatus: "in_progress" },
};

// ─── Registry ────────────────────────────────────────────────────────
// Order determines suggestion priority (first match wins):
// 1. focus_terminal - AI is active, highest priority
// 2. commit - subset of review condition (more specific)
// 3. review - all subtasks done
// 4. execute_subtask - in-execution or ready-to-start with many subtasks
// 5. execute_all - ready-to-start with few subtasks
// 6. structure - idle/started, least progressed

export const ACTIONS: ActionDefinition[] = [
	focus_terminal,
	commit,
	review,
	execute_subtask,
	execute_all,
	structure,
];

// ─── Helpers ─────────────────────────────────────────────────────────

export function getActionById(id: string): ActionDefinition | undefined {
	return ACTIONS.find((action) => action.id === id);
}

export function getSuggestedActionFromRegistry(
	task: TaskFull | null,
): ActionDefinition | null {
	if (!task) return null;
	return ACTIONS.find((action) => action.suggestedWhen(task)) ?? null;
}
