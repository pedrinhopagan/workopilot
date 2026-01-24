import { useMutation, useQueryClient } from "@tanstack/react-query";
import { safeInvoke } from "../../../../services/tauri";
import { trpc } from "../../../../services/trpc";
import type { TaskFull, TaskStatus } from "../../../../types";
import { TASK_IMAGES_QUERY_KEY } from "./useGetTaskFullQuery";

interface UpdateTaskFullParams {
	projectPath: string;
	task: TaskFull;
}

interface UpdateTaskStatusParams {
	taskId: string;
	status: TaskStatus;
}

interface AddImageParams {
	taskId: string;
	filePath: string;
}

interface DeleteImageParams {
	imageId: string;
}

interface TerminalActionParams {
	action: "launch_project" | "focus" | "structure" | "execute_all" | "execute_subtask" | "review";
	projectId: string;
	taskId?: string;
	subtaskId?: string;
}

export function useUpdateTaskFullMutation() {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.saveFull.useMutation({
		onSuccess: (_, variables) => {
			utils.tasks.invalidate();
			if (variables?.id) {
				utils.tasks.get.invalidate({ id: variables.id });
				utils.tasks.getFull.invalidate({ id: variables.id });
			}
		},
	});

	return {
		...mutation,
		mutate: (
			{ task }: UpdateTaskFullParams,
			options?: { onSuccess?: (savedTask: TaskFull) => void },
		) => {
			const taskToSave: TaskFull = {
				...task,
				modified_at: new Date().toISOString(),
				modified_by: "user",
			};
			mutation.mutate(taskToSave, {
				onSuccess: () => options?.onSuccess?.(taskToSave),
			});
		},
		mutateAsync: async ({ task }: UpdateTaskFullParams) => {
			const taskToSave: TaskFull = {
				...task,
				modified_at: new Date().toISOString(),
				modified_by: "user",
			};
			await mutation.mutateAsync(taskToSave);
			return taskToSave;
		},
	};
}

export function useUpdateTaskStatusMutation(taskId: string) {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.updateStatus.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
			utils.tasks.get.invalidate({ id: taskId });
			utils.tasks.getFull.invalidate({ id: taskId });
		},
	});

	return {
		...mutation,
		mutate: ({ taskId: id, status }: UpdateTaskStatusParams) => {
			mutation.mutate({ id, status });
		},
		mutateAsync: async ({ taskId: id, status }: UpdateTaskStatusParams) => {
			return mutation.mutateAsync({ id, status });
		},
	};
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

export function useTerminalActionMutation() {
	return useMutation({
		mutationFn: async ({ action, projectId, taskId, subtaskId }: TerminalActionParams) => {
			await safeInvoke("terminal_action", { action, projectId, taskId, subtaskId });
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
