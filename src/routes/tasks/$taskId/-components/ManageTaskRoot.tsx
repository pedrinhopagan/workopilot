import { useCallback, useEffect, useMemo, useState } from "react";
import { type TaskStatus } from "../../../../lib/constants/taskStatus";
import { openCodeService } from "../../../../services/opencode";
import { safeInvoke, safeListen } from "../../../../services/tauri";
import type { QuickfixPayload, TaskExecution, TaskUpdatedPayload } from "../../../../types";
import { useGetTaskFullQuery } from "../-utils";
import { useTaskForm } from "../-utils/useTaskForm";
import {
	useTerminalActionMutation,
	useLaunchQuickfixMutation,
} from "../-utils/useTaskMutations";
import { ManageTaskForm } from "./ManageTaskForm";
import { ManageTaskHeader } from "./ManageTaskHeader";
import { ManageTaskMetadata } from "./ManageTaskMetadata";
import { ManageTaskStatus } from "./ManageTaskStatus";

interface ManageTaskRootProps {
	taskId: string;
}

export function ManageTaskRoot({ taskId }: ManageTaskRootProps) {
	const {
		task,
		taskFull,
		projectPath,
		activeExecution,
		taskImages,
		isLoading,
		refetch,
		refetchImages,
	} = useGetTaskFullQuery({ taskId });

	const {
		form,
		isSaving,
		aiUpdatedRecently,
		conflictWarning,
		dismissConflictWarning,
		saveField,
		saveContextField,
		addBusinessRule,
		removeBusinessRule,
		addAcceptanceCriteria,
		removeAcceptanceCriteria,
		addSubtask,
		toggleSubtask,
		removeSubtask,
		updateSubtask,
		reorderSubtasks,
	} = useTaskForm({ taskFull, projectPath });

	const [isOpenCodeConnected, setIsOpenCodeConnected] = useState(false);
	const [localTechnicalNotes, setLocalTechnicalNotes] = useState("");
	const [isAdjusting, setIsAdjusting] = useState(false);
	const [adjustingPrompt, setAdjustingPrompt] = useState<string | null>(null);
	const [quickfixInput, setQuickfixInput] = useState("");
	const [viewingImageId, setViewingImageId] = useState<string | null>(null);
	const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
	const [loadedImages, setLoadedImages] = useState<Map<string, { data: string; loading: boolean; error: string | null }>>(new Map());

	const terminalActionMutation = useTerminalActionMutation();
	const launchQuickfixMutation = useLaunchQuickfixMutation();

	const isExecuting = useMemo(() => {
		if (!activeExecution || activeExecution.status !== "running") return false;
		if (activeExecution.last_heartbeat) {
			const last = new Date(activeExecution.last_heartbeat).getTime();
			if (Date.now() - last > 5 * 60 * 1000) return false;
		}
		return true;
	}, [activeExecution]);

	const isBlocked =
		isExecuting ||
		isAdjusting ||
		terminalActionMutation.isPending ||
		launchQuickfixMutation.isPending;

	const pendingSubtasks = useMemo(
		() =>
			taskFull?.subtasks
				.filter((s) => s.status === "pending")
				.sort((a, b) => a.order - b.order) || [],
		[taskFull?.subtasks],
	);

	const canExecuteSubtask = taskFull && pendingSubtasks.length > 0;

	useEffect(() => {
		if (taskFull) {
			setLocalTechnicalNotes(taskFull.context.technical_notes || "");
		}
	}, [taskFull]);

	const loadImage = useCallback(
		async (imageId: string) => {
			const existing = loadedImages.get(imageId);
			if (existing?.data || existing?.loading) return;

			setLoadedImages((prev) => {
				const next = new Map(prev);
				next.set(imageId, { data: "", loading: true, error: null });
				return next;
			});

			try {
				const result = await safeInvoke<{ data: string; mime_type: string }>("get_task_image", { imageId });
				setLoadedImages((prev) => {
					const next = new Map(prev);
					next.set(imageId, {
						data: `data:${result.mime_type};base64,${result.data}`,
						loading: false,
						error: null,
					});
					return next;
				});
			} catch (err) {
				setLoadedImages((prev) => {
					const next = new Map(prev);
					next.set(imageId, {
						data: "",
						loading: false,
						error: err instanceof Error ? err.message : "Erro ao carregar",
					});
					return next;
				});
			}
		},
		[loadedImages],
	);

	useEffect(() => {
		for (const img of taskImages) {
			loadImage(img.id);
		}
	}, [taskImages, loadImage]);

	useEffect(() => {
		let unlistenTask: (() => void) | null = null;
		let unlistenExecution: (() => void) | null = null;
		let unlistenQuickfix: (() => void) | null = null;
		let unsubscribeIdle: (() => void) | null = null;
		let unsubscribeFile: (() => void) | null = null;
		let unsubscribeConnection: (() => void) | null = null;

		async function setup() {
			unlistenTask = await safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
				if (event.payload.task_id === taskId && event.payload.source === "ai") {
					refetch();
				}
			});

			unlistenExecution = await safeListen<TaskExecution>("execution-changed", (event) => {
				if (event.payload.task_id === taskId) {
					if (event.payload.status === "completed" || event.payload.status === "error") {
						refetch();
					}
				}
			});

			unlistenQuickfix = await safeListen<QuickfixPayload>("quickfix-changed", async (event) => {
				if (event.payload.task_id === taskId) {
					if (event.payload.status === "running") {
						setIsAdjusting(true);
						setAdjustingPrompt(event.payload.prompt || null);
					} else {
						setIsAdjusting(false);
						setAdjustingPrompt(null);
						if (event.payload.status === "completed") {
							refetch();
						}
					}
				}
			});

			unsubscribeIdle = openCodeService.onSessionIdle(async (_sessionId, directory) => {
				if (projectPath && directory.includes(projectPath.split("/").pop() || "")) {
					refetch();
				}
			});

			unsubscribeFile = openCodeService.onFileChange(async (filePath) => {
				if (filePath.includes(".workopilot/") || filePath.includes("workopilot.db")) {
					refetch();
				}
			});

			unsubscribeConnection = openCodeService.onConnectionChange((connected) => {
				setIsOpenCodeConnected(connected);
			});

			if (!openCodeService.connected) {
				const success = await openCodeService.init();
				if (success) {
					openCodeService.startListening();
				}
			}
		}

		setup();

		return () => {
			unlistenTask?.();
			unlistenExecution?.();
			unlistenQuickfix?.();
			unsubscribeIdle?.();
			unsubscribeFile?.();
			unsubscribeConnection?.();
		};
	}, [taskId, projectPath, refetch]);

	function hideWindowAfterDelay() {
		setTimeout(() => {
			safeInvoke("hide_window");
		}, 500);
	}

	function handleStructureTask() {
		if (!task?.project_id) return;
		terminalActionMutation.mutate(
			{ action: "structure", projectId: task.project_id, taskId: task.id },
			{ onSuccess: hideWindowAfterDelay },
		);
	}

	function handleExecuteAll() {
		if (!task?.project_id) return;
		terminalActionMutation.mutate(
			{ action: "execute_all", projectId: task.project_id, taskId: task.id },
			{ onSuccess: hideWindowAfterDelay },
		);
	}

	function handleExecuteSubtask(subtaskId: string) {
		if (!task?.project_id) return;
		terminalActionMutation.mutate(
			{ action: "execute_subtask", projectId: task.project_id, taskId: task.id, subtaskId },
			{ onSuccess: hideWindowAfterDelay },
		);
	}

	function handleReviewTask() {
		if (!task?.project_id) return;
		terminalActionMutation.mutate(
			{ action: "review", projectId: task.project_id, taskId: task.id },
			{ onSuccess: hideWindowAfterDelay },
		);
	}

	function handleFocusTerminal() {
		if (!task?.project_id) return;
		terminalActionMutation.mutate(
			{ action: "focus", projectId: task.project_id, taskId: task.id },
		);
	}

	function handleLaunchQuickfix() {
		if (!quickfixInput.trim()) return;
		launchQuickfixMutation.mutate(
			{ taskId, prompt: quickfixInput.trim() },
			{
				onSuccess: () => setQuickfixInput(""),
			},
		);
	}

	function handleStatusChange(newStatus: TaskStatus) {
		saveField("status", newStatus);
	}

	function handleTitleChange(title: string) {
		form.setValue("title", title);
	}

	function handleTitleBlur() {
		saveField("title", form.getValues("title"));
	}

	function handleCategoryChange(category: string) {
		saveField("category", category as "feature" | "bug" | "refactor" | "test" | "docs");
	}

	function handlePriorityChange(priority: number) {
		saveField("priority", priority);
	}

	function handleDescriptionSave(value: string | null) {
		saveContextField("description", value);
	}

	async function handleImageUpload() {
		await refetchImages();
	}

	async function handleImageDelete(imageId: string) {
		try {
			await safeInvoke("delete_task_image", { imageId });
			await refetchImages();
		} catch (e) {
			console.error("Failed to delete image:", e);
		}
	}

	async function handleImageView(imageId: string) {
		try {
			const result = await safeInvoke<{ data: string; mime_type: string }>("get_task_image", { imageId });
			setViewingImageUrl(`data:${result.mime_type};base64,${result.data}`);
			setViewingImageId(imageId);
		} catch (e) {
			console.error("Failed to load image for viewing:", e);
		}
	}

	function handleCloseImageModal() {
		setViewingImageId(null);
		setViewingImageUrl(null);
	}

	function handleTechnicalNotesSave() {
		if (localTechnicalNotes !== (taskFull?.context.technical_notes || "")) {
			saveContextField("technical_notes", localTechnicalNotes || null);
		}
	}

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center text-muted-foreground">
				Carregando...
			</div>
		);
	}

	if (!taskFull) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
				<span>Tarefa não encontrada</span>
			</div>
		);
	}

	return (
		<>
			<ManageTaskHeader
				title={form.watch("title")}
				category={form.watch("category")}
				priority={form.watch("priority")}
				isSaving={isSaving}
				aiUpdatedRecently={aiUpdatedRecently}
				isOpenCodeConnected={isOpenCodeConnected}
				onTitleChange={handleTitleChange}
				onTitleBlur={handleTitleBlur}
				onCategoryChange={handleCategoryChange}
				onPriorityChange={handlePriorityChange}
			/>

			<ManageTaskStatus
				taskFull={taskFull}
				conflictWarning={conflictWarning}
				canExecuteSubtask={!!canExecuteSubtask}
				pendingSubtasks={pendingSubtasks}
				lastAction={taskFull.ai_metadata.last_completed_action}
				isLaunchingTerminalAction={terminalActionMutation.isPending}
				onDismissConflictWarning={dismissConflictWarning}
				onStatusChange={handleStatusChange}
				onStructureTask={handleStructureTask}
				onExecuteAll={handleExecuteAll}
				onExecuteSubtask={handleExecuteSubtask}
				onReviewTask={handleReviewTask}
				onFocusTerminal={handleFocusTerminal}
			/>

			<ManageTaskForm
				taskId={taskId}
				taskFull={taskFull}
				taskImages={taskImages}
				loadedImages={loadedImages}
				activeExecution={activeExecution}
				isBlocked={isBlocked}
				isExecuting={isExecuting}
				isAdjusting={isAdjusting}
				adjustingPrompt={adjustingPrompt}
				quickfixInput={quickfixInput}
				isLaunchingQuickfix={launchQuickfixMutation.isPending}
				onQuickfixInputChange={setQuickfixInput}
				onLaunchQuickfix={handleLaunchQuickfix}
				onDescriptionSave={handleDescriptionSave}
				onImageUpload={handleImageUpload}
				onImageDelete={handleImageDelete}
				onImageView={handleImageView}
				onAddSubtask={addSubtask}
				onToggleSubtask={toggleSubtask}
				onRemoveSubtask={removeSubtask}
				onUpdateSubtask={updateSubtask}
				onReorderSubtasks={reorderSubtasks}
				onAddBusinessRule={addBusinessRule}
				onRemoveBusinessRule={removeBusinessRule}
				onAddAcceptanceCriteria={addAcceptanceCriteria}
				onRemoveAcceptanceCriteria={removeAcceptanceCriteria}
				onTechnicalNotesChange={setLocalTechnicalNotes}
				onTechnicalNotesSave={handleTechnicalNotesSave}
				localTechnicalNotes={localTechnicalNotes}
				viewingImageId={viewingImageId}
				viewingImageUrl={viewingImageUrl}
				onCloseImageModal={handleCloseImageModal}
			/>

			<div className="p-4 border-t border-border">
				<ManageTaskMetadata taskFull={taskFull} />
			</div>
		</>
	);
}
