import type { TaskFull, TaskStatus } from "../types";
import { trpc } from "../services/trpc";

interface UpdateTaskStatusParams {
	taskId: string;
	status: TaskStatus;
}

interface UpdateTaskFullParams {
	projectPath: string;
	task: TaskFull;
}

export function useUpdateTaskStatus() {
	const utils = trpc.useUtils();

	return trpc.tasks.updateStatus.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});
}

// Wrapper to maintain backward-compatible API
export function useUpdateTaskStatusCompat() {
	const mutation = useUpdateTaskStatus();

	return {
		...mutation,
		mutate: ({ taskId, status }: UpdateTaskStatusParams) => {
			mutation.mutate({ id: taskId, status });
		},
		mutateAsync: async ({ taskId, status }: UpdateTaskStatusParams) => {
			return mutation.mutateAsync({ id: taskId, status });
		},
	};
}

export function useUpdateTaskFull() {
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

	// Wrapper to maintain backward-compatible API (projectPath + task)
	return {
		...mutation,
		mutate: ({ task }: UpdateTaskFullParams) => {
			const taskToSave = {
				...task,
				modified_at: new Date().toISOString(),
				modified_by: "user" as const,
			};
			mutation.mutate(taskToSave);
		},
		mutateAsync: async ({ task }: UpdateTaskFullParams) => {
			const taskToSave = {
				...task,
				modified_at: new Date().toISOString(),
				modified_by: "user" as const,
			};
			await mutation.mutateAsync(taskToSave);
			return taskToSave;
		},
	};
}

export function useScheduleTask() {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.schedule.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	// Wrapper to maintain backward-compatible API
	return {
		...mutation,
		mutate: ({ taskId, scheduledDate }: { taskId: string; scheduledDate: string }) => {
			mutation.mutate({ id: taskId, date: scheduledDate });
		},
		mutateAsync: async ({ taskId, scheduledDate }: { taskId: string; scheduledDate: string }) => {
			return mutation.mutateAsync({ id: taskId, date: scheduledDate });
		},
	};
}

export function useUnscheduleTask() {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.unschedule.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	// Wrapper to maintain backward-compatible API
	return {
		...mutation,
		mutate: (taskId: string) => {
			mutation.mutate({ id: taskId });
		},
		mutateAsync: async (taskId: string) => {
			return mutation.mutateAsync({ id: taskId });
		},
	};
}

export function useDeleteTask() {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.delete.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	// Wrapper to maintain backward-compatible API (projectPath not needed in tRPC)
	return {
		...mutation,
		mutate: ({ taskId }: { projectPath: string; taskId: string }) => {
			mutation.mutate({ id: taskId });
		},
		mutateAsync: async ({ taskId }: { projectPath: string; taskId: string }) => {
			return mutation.mutateAsync({ id: taskId });
		},
	};
}

export function useCreateTask() {
	const utils = trpc.useUtils();

	const mutation = trpc.tasks.create.useMutation({
		onSuccess: () => {
			utils.tasks.invalidate();
		},
	});

	// Wrapper to maintain backward-compatible API
	return {
		...mutation,
		mutate: (params: {
			projectId: string;
			projectPath: string;
			title: string;
			priority: number;
			category: string;
		}) => {
			mutation.mutate({
				title: params.title,
				project_id: params.projectId,
			});
		},
		mutateAsync: async (params: {
			projectId: string;
			projectPath: string;
			title: string;
			priority: number;
			category: string;
		}) => {
			const result = await mutation.mutateAsync({
				title: params.title,
				project_id: params.projectId,
			});
			return result.id;
		},
	};
}
