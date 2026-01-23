import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { safeInvoke, safeListen } from "../../../../services/tauri";
import { useDbRefetchStore } from "../../../../stores/dbRefetch";
import type {
	ProjectWithConfig,
	Task,
	TaskExecution,
	TaskFull,
	TaskImageMetadata,
	TaskUpdatedPayload,
} from "../../../../types";

export const TASK_FULL_QUERY_KEY = ["taskFull"] as const;
export const TASK_EXECUTION_QUERY_KEY = ["taskExecution"] as const;
export const TASK_IMAGES_QUERY_KEY = ["taskImages"] as const;

async function fetchTask(taskId: string): Promise<Task | null> {
	return safeInvoke<Task>("get_task_by_id", { taskId }).catch(() => null);
}

async function fetchProjectWithConfig(projectId: string): Promise<ProjectWithConfig | null> {
	return safeInvoke<ProjectWithConfig>("get_project_with_config", { projectId }).catch(() => null);
}

async function fetchTaskFull(taskId: string, projectPath: string): Promise<TaskFull | null> {
	return safeInvoke<TaskFull>("get_task_full", { projectPath, taskId }).catch(() => null);
}

async function fetchTaskExecution(taskId: string): Promise<TaskExecution | null> {
	return safeInvoke<TaskExecution | null>("get_active_task_execution", { taskId }).catch(
		() => null,
	);
}

async function fetchTaskImages(taskId: string): Promise<TaskImageMetadata[]> {
	return safeInvoke<TaskImageMetadata[]>("get_task_images", { taskId }).catch(() => []);
}

interface UseGetTaskFullQueryOptions {
	taskId: string;
}

interface TaskFullQueryResult {
	task: Task | null;
	taskFull: TaskFull | null;
	project: ProjectWithConfig | null;
	projectPath: string | null;
	activeExecution: TaskExecution | null;
	taskImages: TaskImageMetadata[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
	refetchImages: () => void;
}

export function useGetTaskFullQuery({ taskId }: UseGetTaskFullQueryOptions): TaskFullQueryResult {
	const queryClient = useQueryClient();
	const changeCounter = useDbRefetchStore((s) => s.changeCounter);
	const lastChange = useDbRefetchStore((s) => s.lastChange);

	const taskQuery = useQuery({
		queryKey: ["task", taskId],
		queryFn: () => fetchTask(taskId),
		enabled: !!taskId,
		staleTime: 30_000,
		refetchOnMount: "always",
	});

	const task = taskQuery.data ?? null;

	const projectQuery = useQuery({
		queryKey: ["project", task?.project_id],
		queryFn: async () => {
			if (!task?.project_id) return null;
			return fetchProjectWithConfig(task.project_id);
		},
		enabled: !!task?.project_id,
		staleTime: 60_000,
	});

	const project = projectQuery.data ?? null;
	const projectPath = project?.path ?? null;

	const taskFullQuery = useQuery({
		queryKey: [...TASK_FULL_QUERY_KEY, taskId],
		queryFn: async () => {
			if (!projectPath) return null;
			return fetchTaskFull(taskId, projectPath);
		},
		enabled: !!taskId && !!projectPath,
		staleTime: 30_000,
		refetchOnMount: "always",
	});

	const executionQuery = useQuery({
		queryKey: [...TASK_EXECUTION_QUERY_KEY, taskId],
		queryFn: () => fetchTaskExecution(taskId),
		enabled: !!taskId,
		staleTime: 5_000,
		refetchOnMount: "always",
		refetchInterval: 10_000,
	});

	const imagesQuery = useQuery({
		queryKey: [...TASK_IMAGES_QUERY_KEY, taskId],
		queryFn: () => fetchTaskImages(taskId),
		enabled: !!taskId,
		staleTime: 60_000,
	});

	useEffect(() => {
		if (changeCounter === 0) return;
		
		const isRelevant = !lastChange || 
			lastChange.entity_type === "task" || 
			lastChange.entity_type === "subtask";
		
		const isThisTask = !lastChange || 
			lastChange.entity_id === taskId;
		
		if (isRelevant && isThisTask) {
			queryClient.invalidateQueries({ queryKey: ["task", taskId] });
			queryClient.invalidateQueries({ queryKey: [...TASK_FULL_QUERY_KEY, taskId] });
			queryClient.invalidateQueries({ queryKey: [...TASK_EXECUTION_QUERY_KEY, taskId] });
		}
	}, [changeCounter, lastChange, taskId, queryClient]);

	useEffect(() => {
		let unlistenTask: (() => void) | null = null;
		let unlistenExecution: (() => void) | null = null;

		safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
			if (event.payload.task_id === taskId && event.payload.source === "ai") {
				queryClient.invalidateQueries({ queryKey: ["task", taskId] });
				queryClient.invalidateQueries({ queryKey: [...TASK_FULL_QUERY_KEY, taskId] });
			}
		}).then((fn) => {
			unlistenTask = fn;
		});

		safeListen<TaskExecution>("execution-changed", (event) => {
			if (event.payload.task_id === taskId) {
				queryClient.invalidateQueries({ queryKey: [...TASK_EXECUTION_QUERY_KEY, taskId] });
				if (event.payload.status === "completed" || event.payload.status === "error") {
					queryClient.invalidateQueries({ queryKey: [...TASK_FULL_QUERY_KEY, taskId] });
				}
			}
		}).then((fn) => {
			unlistenExecution = fn;
		});

		return () => {
			unlistenTask?.();
			unlistenExecution?.();
		};
	}, [taskId, queryClient]);

	const refetch = () => {
		queryClient.invalidateQueries({ queryKey: ["task", taskId] });
		queryClient.invalidateQueries({ queryKey: [...TASK_FULL_QUERY_KEY, taskId] });
		queryClient.invalidateQueries({ queryKey: [...TASK_EXECUTION_QUERY_KEY, taskId] });
	};

	const refetchImages = () => {
		queryClient.invalidateQueries({ queryKey: [...TASK_IMAGES_QUERY_KEY, taskId] });
	};

	const isLoading = taskQuery.isLoading || projectQuery.isLoading || taskFullQuery.isLoading;
	const isError = taskQuery.isError || projectQuery.isError || taskFullQuery.isError;

	return {
		task,
		taskFull: taskFullQuery.data ?? null,
		project,
		projectPath,
		activeExecution: executionQuery.data ?? null,
		taskImages: imagesQuery.data ?? [],
		isLoading,
		isError,
		refetch,
		refetchImages,
	};
}
