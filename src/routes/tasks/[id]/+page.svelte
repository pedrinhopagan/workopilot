<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import Select from "$lib/components/Select.svelte";
import DescriptionWithImages from "$lib/components/tasks/DescriptionWithImages.svelte";
import ImageModal from "$lib/components/tasks/ImageModal.svelte";
import SubtaskList from "$lib/components/tasks/SubtaskList.svelte";
import {
	getStateColor,
	getStateLabel,
	getTaskState as getTaskStateFromFull,
	type TaskState,
} from "$lib/constants/taskStatus";
import { openCodeConnected, openCodeService } from "$lib/services/opencode";
import type {
	ProjectWithConfig,
	QuickfixPayload,
	Subtask,
	Task,
	TaskExecution,
	TaskFull,
	TaskImageMetadata,
	TaskUpdatedPayload,
} from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import {
	listen,
	listen as tauriListen,
	type UnlistenFn as TauriUnlistenFn,
	type UnlistenFn,
} from "@tauri-apps/api/event";
import { onDestroy } from "svelte";

const taskId = $derived($page.params.id);
let task: Task | null = $state(null);
let taskFull: TaskFull | null = $state(null);
let projectPath: string | null = $state(null);
let isLoading = $state(true);
let isSaving = $state(false);
let newRule = $state("");
let newCriteria = $state("");
let showBusinessRules = $state(false);
let showTechnicalNotes = $state(false);
let showAcceptanceCriteria = $state(false);
let aiUpdatedRecently = $state(false);
let conflictWarning = $state(false);
let isLaunchingStructure = $state(false);
let isLaunchingExecuteAll = $state(false);
let isLaunchingExecuteSubtask = $state(false);
let isLaunchingReview = $state(false);
let showSubtaskSelector = $state(false);
let unlisten: UnlistenFn | null = null;
let unlistenExecution: TauriUnlistenFn | null = null;
let unsubscribeOpenCode: (() => void) | null = null;
let lastKnownModifiedAt: string | null = null;
let isOpenCodeConnected = $state(false);
let activeExecution: TaskExecution | null = $state(null);
let quickfixInput = $state("");
let isLaunchingQuickfix = $state(false);
let isAdjusting = $state(false);
let adjustingPrompt = $state<string | null>(null);
let unlistenQuickfix: TauriUnlistenFn | null = null;
let taskImages: TaskImageMetadata[] = $state([]);
let viewingImageId: string | null = $state(null);

openCodeConnected.subscribe((value) => {
	isOpenCodeConnected = value;
});

function getTaskState(): TaskState {
	return getTaskStateFromFull(taskFull);
}

function canStructure(): boolean {
	if (!taskFull) return false;
	const state = getTaskState();
	// Estruturar disponível apenas em pending ou in_progress
	return state === "pending" || state === "in_progress";
}

function canExecuteAll(): boolean {
	if (!taskFull) return false;
	const state = getTaskState();
	// Executar quando pronta para executar ou em progresso (re-executar)
	return state === "ready_to_execute" || state === "in_progress";
}

function canExecuteSubtask(): boolean {
	if (!taskFull) return false;
	return taskFull.subtasks.some((s) => s.status === "pending");
}

function canReview(): boolean {
	if (!taskFull) return false;
	const state = getTaskState();
	return state === "awaiting_review";
}

function getPendingSubtasks(): Subtask[] {
	if (!taskFull) return [];
	return taskFull.subtasks
		.filter((s) => s.status === "pending")
		.sort((a, b) => a.order - b.order);
}

function getSuggestedAction():
	| "structure"
	| "execute_all"
	| "execute_subtask"
	| "review"
	| null {
	if (!taskFull) return null;

	const state = getTaskState();

	if (state === "pending") return "structure";
	if (state === "awaiting_review") return "review";
	if (state === "ready_to_execute") {
		if (taskFull.subtasks.length === 0) return "execute_all";
		return taskFull.subtasks.some((s) => s.status === "pending")
			? "execute_subtask"
			: "execute_all";
	}

	return null;
}

function getLastActionLabel(action: string | null): string | null {
	if (!action) return null;
	const labels: Record<string, string> = {
		structure: "Estruturação",
		execute_all: "Execução completa",
		execute_subtask: "Execução de subtask",
		review: "Revisão",
	};
	return labels[action] || action;
}

const categories = ["feature", "bug", "refactor", "test", "docs"];
const priorities = [
	{ value: 1, label: "Alta" },
	{ value: 2, label: "Média" },
	{ value: 3, label: "Baixa" },
];

async function loadTask(isReload = false) {
	if (!isReload) isLoading = true;
	try {
		task = await invoke("get_task_by_id", { taskId });

		if (task?.project_id) {
			const project: ProjectWithConfig = await invoke(
				"get_project_with_config",
				{ projectId: task.project_id },
			);
			projectPath = project.path;

			taskFull = await invoke("get_task_full", { projectPath, taskId });
			lastKnownModifiedAt = taskFull?.modified_at || null;

			if (taskFull?.modified_by === "ai") {
				aiUpdatedRecently = true;
				setTimeout(() => {
					aiUpdatedRecently = false;
				}, 5000);
			}

			if (!isReload) {
				showBusinessRules = !!taskFull?.context.business_rules?.length;
				showTechnicalNotes = !!taskFull?.context.technical_notes;
				showAcceptanceCriteria =
					!!taskFull?.context.acceptance_criteria?.length;
			}

			await loadTaskImages();
		}
	} catch (e) {
		console.error("Failed to load task:", e);
	} finally {
		isLoading = false;
	}
}

async function loadActiveExecution() {
	if (!taskId) return;
	try {
		const execution: TaskExecution | null = await invoke(
			"get_active_task_execution",
			{ taskId },
		);
		activeExecution = execution;
	} catch (e) {
		console.error("Failed to load active execution:", e);
		activeExecution = null;
	}
}

async function loadTaskImages() {
	if (!taskId) return;
	try {
		taskImages = await invoke<TaskImageMetadata[]>("get_task_images", {
			taskId,
		});
	} catch (e) {
		console.error("Failed to load task images:", e);
		taskImages = [];
	}
}

async function handleImageUpload() {
	await loadTaskImages();
}

async function handleImageDelete(imageId: string) {
	try {
		await invoke("delete_task_image", { imageId });
		await loadTaskImages();
	} catch (e) {
		console.error("Failed to delete image:", e);
	}
}

function handleImageView(imageId: string) {
	viewingImageId = imageId;
}

function closeImageModal() {
	viewingImageId = null;
}

function isExecuting(): boolean {
	if (!activeExecution || activeExecution.status !== "running") return false;

	if (activeExecution.last_heartbeat) {
		const lastHeartbeat = new Date(activeExecution.last_heartbeat).getTime();
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
		if (lastHeartbeat < fiveMinutesAgo) {
			return false;
		}
	}

	return true;
}

function isBlocked(): boolean {
	return isExecuting() || isAdjusting;
}

function getExecutionLabel(): string {
	if (!activeExecution) return "";
	if (
		activeExecution.execution_type === "subtask" &&
		activeExecution.subtask_id
	) {
		const subtask = taskFull?.subtasks.find(
			(s) => s.id === activeExecution!.subtask_id,
		);
		return subtask
			? `Executando subtask: ${subtask.title}`
			: "Executando subtask...";
	}
	return "Executando tarefa completa...";
}

function getProgressLabel(): string {
	if (!activeExecution) return "";
	if (activeExecution.total_steps > 0) {
		return `Passo [${activeExecution.current_step}/${activeExecution.total_steps}]`;
	}
	return "";
}

async function focusTerminal() {
	if (!activeExecution?.tmux_session) return;
	try {
		await invoke("focus_tmux_session", {
			sessionName: activeExecution.tmux_session,
		});
	} catch (e) {
		console.error("Failed to focus terminal:", e);
	}
}

async function saveTask() {
	if (!taskFull || !projectPath) return;

	if (
		lastKnownModifiedAt &&
		taskFull.modified_at &&
		lastKnownModifiedAt !== taskFull.modified_at
	) {
		if (taskFull.modified_by === "ai") {
			conflictWarning = true;
			setTimeout(() => {
				conflictWarning = false;
			}, 8000);
		}
	}

	isSaving = true;
	try {
		const taskToSave = {
			...taskFull,
			modified_at: new Date().toISOString(),
			modified_by: "user" as const,
		};
		await invoke("update_task_and_sync", { projectPath, task: taskToSave });
		lastKnownModifiedAt = taskToSave.modified_at;
		taskFull = taskToSave;
	} catch (e) {
		console.error("Failed to save task:", e);
	} finally {
		isSaving = false;
	}
}

async function setupEventListener() {
	unlisten = await listen<TaskUpdatedPayload>("task-updated", async (event) => {
		if (event.payload.task_id === taskId && event.payload.source === "ai") {
			console.log(
				"[WorkoPilot] Task updated by AI (Tauri event), reloading...",
			);
			await loadTask(true);
			aiUpdatedRecently = true;
			setTimeout(() => {
				aiUpdatedRecently = false;
			}, 5000);
		}
	});

	unlistenExecution = await tauriListen("execution-changed", async () => {
		console.log("[WorkoPilot] Execution state changed, reloading...");
		await loadActiveExecution();
	});

	unlistenQuickfix = await tauriListen<QuickfixPayload>(
		"quickfix-changed",
		async (event) => {
			if (event.payload.task_id === taskId) {
				console.log(
					"[WorkoPilot] Quickfix status changed:",
					event.payload.status,
				);
				if (event.payload.status === "running") {
					isAdjusting = true;
					adjustingPrompt = event.payload.prompt;
				} else {
					isAdjusting = false;
					adjustingPrompt = null;
					if (event.payload.status === "completed") {
						await loadTask(true);
						aiUpdatedRecently = true;
						setTimeout(() => {
							aiUpdatedRecently = false;
						}, 5000);
					}
				}
			}
		},
	);

	setupOpenCodeListener();
}

function setupOpenCodeListener() {
	unsubscribeOpenCode = openCodeService.onSessionIdle(
		async (sessionId, directory) => {
			console.log(
				"[WorkoPilot] OpenCode session idle:",
				sessionId,
				"in",
				directory,
			);

			if (
				projectPath &&
				directory.includes(projectPath.split("/").pop() || "")
			) {
				console.log(
					"[WorkoPilot] Detected skill completion in project, reloading task...",
				);
				await loadTask(true);
				aiUpdatedRecently = true;
				setTimeout(() => {
					aiUpdatedRecently = false;
				}, 5000);
			}
		},
	);

	const unsubscribeFileEdit = openCodeService.onFileChange(
		async (filePath, directory) => {
			if (
				filePath.includes(".workopilot/") ||
				filePath.includes("workopilot.db")
			) {
				console.log(
					"[WorkoPilot] Detected file change in workopilot data:",
					filePath,
				);
				await loadTask(true);
			}
		},
	);

	const originalUnsubscribe = unsubscribeOpenCode;
	unsubscribeOpenCode = () => {
		originalUnsubscribe?.();
		unsubscribeFileEdit();
	};

	if (!openCodeService.connected) {
		openCodeService.init().then((success) => {
			if (success) {
				openCodeService.startListening();
			}
		});
	}
}

async function cleanup() {
	if (unlisten) {
		unlisten();
		unlisten = null;
	}
	if (unlistenExecution) {
		unlistenExecution();
		unlistenExecution = null;
	}
	if (unlistenQuickfix) {
		unlistenQuickfix();
		unlistenQuickfix = null;
	}
	if (unsubscribeOpenCode) {
		unsubscribeOpenCode();
		unsubscribeOpenCode = null;
	}
}

onDestroy(() => {
	cleanup();
});

async function updateField<K extends keyof TaskFull>(
	field: K,
	value: TaskFull[K],
) {
	if (!taskFull) return;
	taskFull = { ...taskFull, [field]: value };
	await saveTask();
}

async function updateContext<K extends keyof TaskFull["context"]>(
	field: K,
	value: TaskFull["context"][K],
) {
	if (!taskFull) return;
	taskFull = {
		...taskFull,
		context: { ...taskFull.context, [field]: value },
	};
	await saveTask();
}

function addRule() {
	if (!newRule.trim() || !taskFull) return;
	const newRules = [...taskFull.context.business_rules, newRule.trim()];
	newRule = "";
	updateContext("business_rules", newRules);
}

function removeRule(index: number) {
	if (!taskFull) return;
	const newRules = taskFull.context.business_rules.filter(
		(_, i) => i !== index,
	);
	updateContext("business_rules", newRules);
}

function addCriteria() {
	if (!newCriteria.trim() || !taskFull) return;
	const current = taskFull.context.acceptance_criteria || [];
	const newList = [...current, newCriteria.trim()];
	newCriteria = "";
	updateContext("acceptance_criteria", newList);
}

function removeCriteria(index: number) {
	if (!taskFull) return;
	const current = taskFull.context.acceptance_criteria || [];
	const newList = current.filter((_, i) => i !== index);
	updateContext("acceptance_criteria", newList.length > 0 ? newList : null);
}

function addSubtask(title: string) {
	if (!taskFull) return;
	const nextOrder =
		taskFull.subtasks.length > 0
			? Math.max(...taskFull.subtasks.map((s) => s.order)) + 1
			: 0;
	const newSubtask: Subtask = {
		id: crypto.randomUUID(),
		title,
		status: "pending",
		order: nextOrder,
		description: null,
		acceptance_criteria: null,
		technical_notes: null,
		prompt_context: null,
		created_at: new Date().toISOString(),
		completed_at: null,
	};
	const newList = [...taskFull.subtasks, newSubtask];
	updateField("subtasks", newList);
}

function toggleSubtask(id: string) {
	if (!taskFull) return;
	const newList = taskFull.subtasks.map((s: Subtask) => {
		if (s.id === id) {
			const newStatus = s.status === "done" ? "pending" : "done";
			return {
				...s,
				status: newStatus,
				completed_at: newStatus === "done" ? new Date().toISOString() : null,
			};
		}
		return s;
	});
	updateField("subtasks", newList);

	// Check if all subtasks done -> suggest review
	const allDone = newList.every((s) => s.status === "done");
	if (allDone && newList.length > 0 && taskFull.status !== "done") {
		updateField("status", "awaiting_review");
	}
}

function removeSubtask(id: string) {
	if (!taskFull) return;
	const newList = taskFull.subtasks.filter((s: Subtask) => s.id !== id);
	for (let i = 0; i < newList.length; i++) {
		newList[i].order = i;
	}
	updateField("subtasks", newList);
}

function updateSubtask(id: string, field: keyof Subtask, value: any) {
	if (!taskFull) return;
	const newList = taskFull.subtasks.map((s: Subtask) => {
		if (s.id === id) {
			return { ...s, [field]: value };
		}
		return s;
	});
	updateField("subtasks", newList);
}

function reorderSubtasks(newList: Subtask[]) {
	if (!taskFull) return;
	updateField("subtasks", newList);
}

async function codarSubtask(id: string) {
	if (!task?.project_id) return;
	try {
		await invoke("launch_task_workflow", {
			projectId: task.project_id,
			taskId: task.id,
			subtaskId: id,
		});
	} catch (e) {
		console.error("Failed to launch subtask workflow:", e);
	}
}

async function structureTask() {
	if (!task?.project_id || isLaunchingStructure) return;
	isLaunchingStructure = true;
	try {
		await invoke("launch_task_structure", {
			projectId: task.project_id,
			taskId: task.id,
		});
	} catch (e) {
		console.error("Failed to launch task structure:", e);
	} finally {
		setTimeout(() => {
			isLaunchingStructure = false;
		}, 3000);
	}
}

async function executeAll() {
	if (!task?.project_id || isLaunchingExecuteAll) return;
	isLaunchingExecuteAll = true;
	try {
		await invoke("launch_task_execute_all", {
			projectId: task.project_id,
			taskId: task.id,
		});
	} catch (e) {
		console.error("Failed to launch execute all:", e);
	} finally {
		setTimeout(() => {
			isLaunchingExecuteAll = false;
		}, 3000);
	}
}

async function executeSubtask(subtaskId: string) {
	if (!task?.project_id || isLaunchingExecuteSubtask) return;
	isLaunchingExecuteSubtask = true;
	showSubtaskSelector = false;
	try {
		await invoke("launch_task_execute_subtask", {
			projectId: task.project_id,
			taskId: task.id,
			subtaskId,
		});
	} catch (e) {
		console.error("Failed to launch execute subtask:", e);
	} finally {
		setTimeout(() => {
			isLaunchingExecuteSubtask = false;
		}, 3000);
	}
}

async function reviewTask() {
	if (!task?.project_id || isLaunchingReview) return;
	isLaunchingReview = true;
	try {
		await invoke("launch_task_review", {
			projectId: task.project_id,
			taskId: task.id,
		});
	} catch (e) {
		console.error("Failed to launch task review:", e);
	} finally {
		setTimeout(() => {
			isLaunchingReview = false;
		}, 3000);
	}
}

async function submitQuickfix() {
	if (
		!task?.project_id ||
		!quickfixInput.trim() ||
		isLaunchingQuickfix ||
		isBlocked()
	)
		return;
	isLaunchingQuickfix = true;
	try {
		await invoke("launch_quickfix_background", {
			projectId: task.project_id,
			taskId: task.id,
			quickfixPrompt: quickfixInput.trim(),
		});
		quickfixInput = "";
	} catch (e) {
		console.error("Failed to launch quickfix:", e);
	} finally {
		setTimeout(() => {
			isLaunchingQuickfix = false;
		}, 3000);
	}
}

function goBack() {
	goto("/tasks");
}

function getCategoryOptions() {
	return categories.map((c) => ({ value: c, label: c }));
}

function getPriorityOptions() {
	return priorities.map((p) => ({ value: String(p.value), label: p.label }));
}

$effect(() => {
	if (taskId) {
		loadTask();
		// loadActiveExecution(); // Temporariamente desabilitado para teste
		setupEventListener();
	}

	return () => {
		cleanup();
	};
});
</script>

{#if isLoading}
  <div class="flex-1 flex items-center justify-center text-[#636363]">
    Carregando...
  </div>
{:else if !taskFull}
  <div class="flex-1 flex justify-center items-center justify-center text-[#636363] gap-4">
    <span>Tarefa não encontrada</span>
    <button onclick={goBack} class="text-[#909d63] hover:underline">Voltar</button>
  </div>
{:else}
  <div class="flex items-center gap-2 p-2 border-b border-[#3d3a34] bg-[#1c1c1c]">
    <button
      onclick={goBack}
      class="text-[#636363] hover:text-[#d6d6d6] transition-colors p-1"
      title="Voltar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>
    
    <input
      type="text"
      bind:value={taskFull.title}
      onblur={() => updateField('title', taskFull!.title)}
      class="flex-1 bg-transparent text-[#d6d6d6] text-base font-medium focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors"
    />
    
    <Select
      value={taskFull.category}
      options={getCategoryOptions()}
      onchange={(v) => updateField('category', v)}
    />
    
    <Select
      value={String(taskFull.priority)}
      options={getPriorityOptions()}
      onchange={(v) => updateField('priority', parseInt(v))}
    />
    
    {#if isSaving}
      <span class="text-xs text-[#636363]">Salvando...</span>
    {/if}
    
    {#if aiUpdatedRecently}
      <span class="text-xs text-[#909d63] flex items-center gap-1 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
        </svg>
        IA atualizou
      </span>
    {/if}
    
    <span 
      class="w-2 h-2 rounded-full {isOpenCodeConnected ? 'bg-[#61afef]' : 'bg-[#636363]'}" 
      title={isOpenCodeConnected ? 'OpenCode conectado - atualizações em tempo real' : 'OpenCode desconectado'}
    ></span>
  </div>
  
  {#if conflictWarning}
    <div class="px-4 py-2 bg-[#3d3a34] border-b border-[#4a4a4a] text-[#d6d6d6] text-sm flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
      <span>A IA fez alteracoes nesta task. Suas edicoes podem sobrescrever as mudancas da IA.</span>
      <button onclick={() => { conflictWarning = false; }} class="ml-auto text-[#636363] hover:text-[#d6d6d6]">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
  {/if}
  
  {@const taskState = getTaskState()}
  {@const suggestedAction = getSuggestedAction()}
  {@const lastAction = getLastActionLabel(taskFull.ai_metadata.last_completed_action)}
  <div class="border-b border-[#3d3a34] bg-gradient-to-r from-[#1c1c1c] via-[#232323] to-[#1c1c1c]">
    <div class="px-4 py-3 flex items-center gap-4 border-b border-[#2a2a2a]">
      <div class="flex items-center gap-2">
        <span 
          class="w-2.5 h-2.5 rounded-full animate-pulse" 
          style="background-color: {getStateColor(taskState)}; box-shadow: 0 0 8px {getStateColor(taskState)}40;"
        ></span>
        <span class="text-sm font-medium" style="color: {getStateColor(taskState)};">
          {getStateLabel(taskState)}
        </span>
      </div>
      
      {#if lastAction}
        <div class="flex items-center gap-1.5 text-xs text-[#636363]">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>
          </svg>
          <span>Última ação: <span class="text-[#909d63]">{lastAction}</span></span>
        </div>
      {/if}
      
      <div class="ml-auto flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full transition-colors {taskState !== 'pending' ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}"></span>
        <span class="w-4 h-px {taskState !== 'pending' ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}"></span>
        <span class="w-1.5 h-1.5 rounded-full transition-colors {taskState === 'in_progress' || taskState === 'awaiting_review' || taskState === 'done' ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}"></span>
        <span class="w-4 h-px {taskState === 'awaiting_review' || taskState === 'done' ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}"></span>
        <span class="w-1.5 h-1.5 rounded-full transition-colors {taskState === 'done' ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}"></span>
      </div>
    </div>
    
    <div class="px-4 py-4 flex items-stretch gap-3">
      <button
        onclick={structureTask}
        disabled={!canStructure() || isLaunchingStructure}
        class="action-btn flex-1 flex justify-center items-center gap-2 p-4 rounded-lg border transition-all duration-200 cursor-pointer
          {suggestedAction === 'structure'
            ? 'border-[#e5c07b] bg-[#e5c07b]/10 text-[#e5c07b] ring-2 ring-[#e5c07b]/50 shadow-[0_0_20px_rgba(229,192,123,0.3)]' 
            : canStructure()
              ? 'border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]' 
              : 'border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed'}"
      >
        {#if isLaunchingStructure}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" x2="8" y1="13" y2="13"/>
            <line x1="16" x2="8" y1="17" y2="17"/>
            <line x1="10" x2="8" y1="9" y2="9"/>
          </svg>
        {/if}
        <span class="text-sm font-medium">Estruturar</span>
      </button>
      
      <button
        onclick={executeAll}
        disabled={!canExecuteAll() || isLaunchingExecuteAll}
        class="action-btn flex-1 flex justify-center items-center gap-2 p-4 rounded-lg border transition-all duration-200 cursor-pointer
          {suggestedAction === 'execute_all'
            ? 'border-[#909d63] bg-[#909d63]/10 text-[#909d63] ring-2 ring-[#909d63]/50 shadow-[0_0_20px_rgba(144,157,99,0.3)]'
            : canExecuteAll()
              ? 'border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]'
              : 'border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed'}"
      >
        {#if isLaunchingExecuteAll}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
          </svg>
        {/if}
        <span class="text-sm font-medium">Executar Tudo</span>
      </button>
      
      <div class="flex-1 relative">
        <button
          onclick={() => { if (canExecuteSubtask()) showSubtaskSelector = !showSubtaskSelector; }}
          disabled={!canExecuteSubtask() || isLaunchingExecuteSubtask}
          class="action-btn w-full h-full flex justify-center items-center gap-2 p-4 rounded-lg border transition-all duration-200 cursor-pointer
            {suggestedAction === 'execute_subtask'
              ? 'border-[#61afef] bg-[#61afef]/10 text-[#61afef] ring-2 ring-[#61afef]/50 shadow-[0_0_20px_rgba(97,175,239,0.3)]'
              : canExecuteSubtask()
                ? 'border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]'
                : 'border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed'}"
        >
          {#if isLaunchingExecuteSubtask}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          {/if}
          <span class="text-sm font-medium">Executar Subtask</span>
          {#if canExecuteSubtask()}
            <span class="text-[10px] opacity-60">{getPendingSubtasks().length} pendente{getPendingSubtasks().length !== 1 ? 's' : ''}</span>
          {/if}
        </button>
        
        {#if showSubtaskSelector && canExecuteSubtask()}
          <div class="absolute top-full left-0 right-0 mt-2 bg-[#232323] border border-[#3d3a34] rounded-lg shadow-xl z-50 overflow-hidden animate-slide-down">
            <div class="px-3 py-2 border-b border-[#3d3a34] text-xs text-[#636363] uppercase tracking-wider">
              Selecione uma subtask
            </div>
            <div class="max-h-48 overflow-y-auto">
              {#each getPendingSubtasks() as subtask}
                <button
                  onclick={() => executeSubtask(subtask.id)}
                  class="w-full px-3 py-2.5 text-left text-sm text-[#d6d6d6] hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
                >
                  <span class="w-5 h-5 flex items-center justify-center rounded bg-[#3d3a34] text-[10px] text-[#909d63]">
                    {subtask.order + 1}
                  </span>
                  <span class="flex-1 truncate">{subtask.title}</span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <button
        onclick={() => { console.log('BOTAO REVISAR CLICADO!', { canReview: canReview(), isLaunchingReview, task }); reviewTask(); }}
        disabled={!canReview() || isLaunchingReview}
        class="action-btn flex-1 flex justify-center items-center gap-2 p-4 rounded-lg border transition-all duration-200 cursor-pointer
          {suggestedAction === 'review'
            ? 'border-[#e5c07b] bg-[#e5c07b]/10 text-[#e5c07b] ring-2 ring-[#e5c07b]/50 shadow-[0_0_20px_rgba(229,192,123,0.3)]'
            : canReview()
              ? 'border-[#3d3a34] bg-[#232323] text-[#d6d6d6] hover:border-[#4a4a4a] hover:bg-[#2a2a2a]'
              : 'border-[#2a2a2a] bg-[#1c1c1c] text-[#4a4a4a] cursor-not-allowed'}"
      >
        {#if isLaunchingReview}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        {/if}
        <span class="text-sm font-medium">Revisar</span>
      </button>
    </div>
  </div>
  
  {#if isExecuting()}
    <div class="border-b border-[#3d3a34] bg-gradient-to-r from-[#909d63]/10 via-[#909d63]/5 to-[#909d63]/10 px-4 py-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-3 h-3 bg-[#909d63] rounded-full animate-pulse"></div>
            <div class="absolute inset-0 w-3 h-3 bg-[#909d63] rounded-full animate-ping opacity-50"></div>
          </div>
          <div>
            <div class="text-sm font-medium text-[#909d63]">{getExecutionLabel()}</div>
            {#if getProgressLabel()}
              <div class="text-xs text-[#636363]">{getProgressLabel()}</div>
            {/if}
          </div>
        </div>
        
        {#if activeExecution?.current_step_description}
          <div class="flex-1 text-sm text-[#d6d6d6] truncate">
            {activeExecution.current_step_description}
          </div>
        {/if}
        
        <div class="flex items-center gap-3">
          {#if activeExecution?.waiting_for_input}
            <div class="flex items-center gap-2 px-3 py-1.5 bg-[#e5c07b]/20 border border-[#e5c07b]/40 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e5c07b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse">
                <path d="M12 9v4"/><path d="M12 17h.01"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span class="text-xs text-[#e5c07b] font-medium">Aguardando input</span>
            </div>
          {/if}
          
          {#if activeExecution?.tmux_session}
            <button
              onclick={focusTerminal}
              class="flex items-center gap-2 px-3 py-1.5 bg-[#3d3a34] hover:bg-[#4a4a4a] text-[#d6d6d6] text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" x2="20" y1="19" y2="19"/>
              </svg>
              Ver Terminal
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
  
  {#if isAdjusting}
    <div class="border-b border-[#3d3a34] bg-gradient-to-r from-[#61afef]/10 via-[#61afef]/5 to-[#61afef]/10 px-4 py-4">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-3 h-3 bg-[#61afef] rounded-full animate-pulse"></div>
            <div class="absolute inset-0 w-3 h-3 bg-[#61afef] rounded-full animate-ping opacity-50"></div>
          </div>
          <div>
            <div class="text-sm font-medium text-[#61afef]">Agent ajustando tarefa...</div>
            <div class="text-xs text-[#636363]">Os campos estão bloqueados durante o ajuste</div>
          </div>
        </div>
        
        {#if adjustingPrompt}
          <div class="flex-1 text-sm text-[#d6d6d6] truncate italic">
            "{adjustingPrompt}"
          </div>
        {/if}
        
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#61afef" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
      </div>
    </div>
  {/if}
  
  <div class="border-b border-[#3d3a34] bg-[#1c1c1c] px-4 py-3">
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 text-[#828282]">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/>
          <path d="m14 7 3 3"/>
          <path d="M5 6v4"/>
          <path d="M19 14v4"/>
          <path d="M10 2v2"/>
          <path d="M7 8H3"/>
          <path d="M21 16h-4"/>
          <path d="M11 3H9"/>
        </svg>
        <span class="text-xs uppercase tracking-wide">Quick-fix</span>
      </div>
      <div class="flex-1 flex items-center gap-2">
        <input
          type="text"
          bind:value={quickfixInput}
          onkeydown={(e) => e.key === 'Enter' && submitQuickfix()}
          disabled={isBlocked() || isLaunchingQuickfix}
          placeholder="Descreva o ajuste desejado..."
          class="flex-1 px-3 py-1.5 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#4a4a4a]"
        />
        <button
          onclick={submitQuickfix}
          disabled={!quickfixInput.trim() || isBlocked() || isLaunchingQuickfix}
          class="flex items-center gap-2 px-3 py-1.5 bg-[#909d63] hover:bg-[#a0ad73] text-[#1c1c1c] text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {#if isLaunchingQuickfix}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Aplicando...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m5 12 5 5 9-9"/>
            </svg>
            Aplicar
          {/if}
        </button>
      </div>
    </div>
  </div>
  
  <div class="flex-1 overflow-y-auto p-4 space-y-6">
    {#if taskId}
      <DescriptionWithImages
        taskId={taskId}
        description={taskFull.context.description || ''}
        images={taskImages}
        maxImages={5}
        disabled={isBlocked()}
        onDescriptionChange={(value) => updateContext('description', value)}
        onImageUpload={handleImageUpload}
        onImageDelete={handleImageDelete}
        onImageView={handleImageView}
      />
    {/if}
    
    <section>
      <button 
        onclick={() => showBusinessRules = !showBusinessRules}
        class="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="transition-transform duration-200"
          style="transform: rotate({showBusinessRules ? 90 : 0}deg)"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        Regras de Negócio (opcional)
      </button>
      {#if showBusinessRules}
        <div class="space-y-2 animate-slide-down {isBlocked() ? 'opacity-50 pointer-events-none' : ''}">
          {#each taskFull.context.business_rules as rule, i}
            <div class="flex items-center gap-2 group animate-fade-in">
              <span class="text-[#636363]">•</span>
              <span class="flex-1 text-[#d6d6d6] text-sm">{rule}</span>
              <button
                onclick={() => removeRule(i)}
                disabled={isBlocked()}
                class="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
          {/each}
          <div class="flex items-center gap-2">
            <span class="text-[#636363]">+</span>
            <input
              type="text"
              bind:value={newRule}
              onkeydown={(e) => e.key === 'Enter' && addRule()}
              disabled={isBlocked()}
              placeholder="Adicionar regra..."
              class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:cursor-not-allowed"
            />
          </div>
        </div>
      {/if}
    </section>
    
    <section>
      <button 
        onclick={() => showTechnicalNotes = !showTechnicalNotes}
        class="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="transition-transform duration-200"
          style="transform: rotate({showTechnicalNotes ? 90 : 0}deg)"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        Notas Técnicas (opcional)
      </button>
      {#if showTechnicalNotes}
        <div class="animate-slide-down">
          <textarea
            bind:value={taskFull.context.technical_notes}
            onblur={() => updateContext('technical_notes', taskFull!.context.technical_notes || null)}
            disabled={isBlocked()}
            placeholder="Stack, libs, padrões relevantes..."
            rows="2"
            class="w-full px-3 py-2 bg-[#232323] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:border-[#909d63] focus:outline-none resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          ></textarea>
        </div>
      {/if}
    </section>
    
    <section>
      <button 
        onclick={() => showAcceptanceCriteria = !showAcceptanceCriteria}
        class="flex items-center gap-2 text-xs text-[#828282] uppercase tracking-wide mb-2 hover:text-[#d6d6d6] transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="transition-transform duration-200"
          style="transform: rotate({showAcceptanceCriteria ? 90 : 0}deg)"
        >
          <path d="m9 18 6-6-6-6"/>
        </svg>
        Critérios de Aceite (opcional)
      </button>
      {#if showAcceptanceCriteria}
        <div class="space-y-2 animate-slide-down {isBlocked() ? 'opacity-50 pointer-events-none' : ''}">
          {#each taskFull.context.acceptance_criteria || [] as criteria, i}
            <div class="flex items-center gap-2 group animate-fade-in">
              <span class="text-[#636363]">✓</span>
              <span class="flex-1 text-[#d6d6d6] text-sm">{criteria}</span>
              <button
                onclick={() => removeCriteria(i)}
                disabled={isBlocked()}
                class="opacity-0 group-hover:opacity-100 text-[#bc5653] hover:text-[#cc6663] transition-all p-1 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
          {/each}
          <div class="flex items-center gap-2">
            <span class="text-[#636363]">+</span>
            <input
              type="text"
              bind:value={newCriteria}
              onkeydown={(e) => e.key === 'Enter' && addCriteria()}
              disabled={isBlocked()}
              placeholder="Adicionar critério..."
              class="flex-1 bg-transparent text-[#d6d6d6] text-sm focus:outline-none border-b border-transparent focus:border-[#909d63] transition-colors placeholder:text-[#4a4a4a] disabled:cursor-not-allowed"
            />
          </div>
        </div>
      {/if}
    </section>
    
    <SubtaskList
      subtasks={taskFull.subtasks}
      onAdd={addSubtask}
      onToggle={toggleSubtask}
      onRemove={removeSubtask}
      onCodar={codarSubtask}
      onUpdate={updateSubtask}
      onReorder={reorderSubtasks}
      disabled={isBlocked()}
    />
    
    <section class={isBlocked() ? 'opacity-50 pointer-events-none' : ''}>
      <div class="flex items-center justify-between">
        <label class="block text-xs text-[#828282] uppercase tracking-wide">Configuração</label>
      </div>
      <div class="mt-2 p-3 bg-[#232323] border border-[#3d3a34]">
        <button
          onclick={() => updateField('initialized', !taskFull!.initialized)}
          disabled={isBlocked()}
          class="flex items-center gap-3 w-full text-left group disabled:cursor-not-allowed"
        >
          <span class="w-10 h-5 rounded-full transition-colors relative {taskFull.initialized ? 'bg-[#909d63]' : 'bg-[#3d3a34]'}">
            <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-[#d6d6d6] rounded-full transition-transform {taskFull.initialized ? 'translate-x-5' : 'translate-x-0'}"></span>
          </span>
          <div class="flex-1">
            <span class="text-sm text-[#d6d6d6]">Pronta para executar</span>
            <p class="text-xs text-[#636363] mt-0.5">
              {#if taskFull.initialized}
                A IA executará diretamente sem fazer perguntas de configuração
              {:else}
                A IA fará perguntas para completar a configuração antes de executar
              {/if}
            </p>
          </div>
        </button>
      </div>
    </section>
    
    <section>
      <label class="block text-xs text-[#828282] uppercase tracking-wide mb-2">Metadados IA</label>
      <pre class="w-full px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#909d63] text-xs overflow-x-auto font-mono"><code>{JSON.stringify(taskFull.ai_metadata, null, 2)}</code></pre>
    </section>
  </div>
  
  <ImageModal imageId={viewingImageId} onClose={closeImageModal} />
{/if}

<style>
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slide-down {
    from { 
      opacity: 0;
      transform: translateY(-8px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  .animate-slide-down {
    animation: slide-down 0.2s ease-out;
  }
</style>
