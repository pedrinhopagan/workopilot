import { useMutation, useQueryClient } from "@tanstack/react-query";
import { safeInvoke } from "../../../../services/tauri";
import type { TaskFull } from "../../../../types";
import { TASK_FULL_QUERY_KEY, TASK_IMAGES_QUERY_KEY } from "./useGetTaskFullQuery";

interface UpdateTaskFullParams {
	projectPath: string;
	task: TaskFull;
}

interface UpdateTaskStatusParams {
	taskId: string;
	status: string;
}

interface AddImageParams {
	taskId: string;
	filePath: string;
}

interface DeleteImageParams {
	imageId: string;
}

interface LaunchWorkflowParams {
	projectId: string;
	taskId: string;
	subtaskId?: string;
}

export function useUpdateTaskFullMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectPath, task }: UpdateTaskFullParams) => {
			const taskToSave: TaskFull = {
				...task,
				modified_at: new Date().toISOString(),
				modified_by: "user",
			};
			await safeInvoke("update_task_and_sync", { projectPath, task: taskToSave });
			return taskToSave;
		},
		onSuccess: (savedTask) => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["task", savedTask.id] });
			queryClient.invalidateQueries({ queryKey: [...TASK_FULL_QUERY_KEY, savedTask.id] });
		},
	});
}

export function useUpdateTaskStatusMutation(taskId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ taskId, status }: UpdateTaskStatusParams) => {
			await safeInvoke("update_task_status", { taskId, status });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["task", taskId] });
			queryClient.invalidateQueries({ queryKey: [...TASK_FULL_QUERY_KEY, taskId] });
		},
	});
}

export function useAddTaskImageMutation(taskId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ taskId, filePath }: AddImageParams) => {
			await safeInvoke("add_task_image_from_path", { taskId, filePath });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...TASK_IMAGES_QUERY_KEY, taskId] });
		},
	});
}

export function useDeleteTaskImageMutation(taskId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ imageId }: DeleteImageParams) => {
			await safeInvoke("delete_task_image", { imageId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...TASK_IMAGES_QUERY_KEY, taskId] });
		},
	});
}

export function useLaunchStructureMutation() {
	return useMutation({
		mutationFn: async ({ projectId, taskId }: LaunchWorkflowParams) => {
			await safeInvoke("launch_task_structure", { projectId, taskId });
		},
	});
}

export function useLaunchExecuteAllMutation() {
	return useMutation({
		mutationFn: async ({ projectId, taskId }: LaunchWorkflowParams) => {
			await safeInvoke("launch_task_execute_all", { projectId, taskId });
		},
	});
}

export function useLaunchExecuteSubtaskMutation() {
	return useMutation({
		mutationFn: async ({ projectId, taskId, subtaskId }: LaunchWorkflowParams) => {
			await safeInvoke("launch_task_execute_subtask", { projectId, taskId, subtaskId });
		},
	});
}

export function useLaunchReviewMutation() {
	return useMutation({
		mutationFn: async ({ projectId, taskId }: LaunchWorkflowParams) => {
			await safeInvoke("launch_task_review", { projectId, taskId });
		},
	});
}

export function useLaunchQuickfixMutation() {
	return useMutation({
		mutationFn: async ({ taskId, prompt }: { taskId: string; prompt: string }) => {
			await safeInvoke("send_quickfix", { taskId, prompt });
		},
	});
}

export function useFocusTmuxSessionMutation() {
	return useMutation({
		mutationFn: async ({ sessionName }: { sessionName: string }) => {
			await safeInvoke("focus_tmux_session", { sessionName });
		},
	});
}
