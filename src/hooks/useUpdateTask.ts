import { useMutation, useQueryClient } from "@tanstack/react-query";
import { safeInvoke } from "../services/tauri";
import type { TaskFull } from "../types";

type TaskStatus = "pending" | "in_progress" | "done";

interface UpdateTaskStatusParams {
	taskId: string;
	status: TaskStatus;
}

interface UpdateTaskFullParams {
	projectPath: string;
	task: TaskFull;
}

export function useUpdateTaskStatus() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ taskId, status }: UpdateTaskStatusParams) => {
			await safeInvoke("update_task_status", { taskId, status });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useUpdateTaskFull() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectPath, task }: UpdateTaskFullParams) => {
			const taskToSave = {
				...task,
				modified_at: new Date().toISOString(),
				modified_by: "user" as const,
			};
			await safeInvoke("update_task_and_sync", { projectPath, task: taskToSave });
			return taskToSave;
		},
		onSuccess: (savedTask) => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["task", savedTask.id] });
		},
	});
}

export function useScheduleTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ taskId, scheduledDate }: { taskId: string; scheduledDate: string }) => {
			await safeInvoke("schedule_task", { taskId, scheduledDate });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["tasksForMonth"] });
		},
	});
}

export function useUnscheduleTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (taskId: string) => {
			await safeInvoke("unschedule_task", { taskId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["tasksForMonth"] });
		},
	});
}

export function useDeleteTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ projectPath, taskId }: { projectPath: string; taskId: string }) => {
			await safeInvoke("delete_task_full", { projectPath, taskId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}

export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: {
			projectId: string;
			projectPath: string;
			title: string;
			priority: number;
			category: string;
		}) => {
			const taskId = await safeInvoke<string>("create_task_with_json", params);
			return taskId;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
		},
	});
}
