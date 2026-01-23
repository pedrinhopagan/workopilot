import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { safeInvoke, safeListen } from "../../../services/tauri";
import { useDbRefetchStore } from "../../../stores/dbRefetch";
import type {
	ProjectWithConfig,
	TaskExecution,
	TaskFull,
	TaskUpdatedPayload,
} from "../../../types";
import type { TaskQueryFilters } from "./useGetTaskQuery";

export const TASKS_FULL_QUERY_KEY = ["tasksFull"] as const;
export const EXECUTIONS_QUERY_KEY = ["activeExecutions"] as const;

interface PaginatedTasksResult {
	items: TaskFull[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

async function fetchTasksFullPaginated(filters: TaskQueryFilters): Promise<PaginatedTasksResult> {
	const params: Record<string, unknown> = {};

	if (filters.projectId) {
		params.project_id = filters.projectId;
	}
	if (filters.q) {
		params.q = filters.q;
	}
	if (filters.priority) {
		params.priority = filters.priority;
	}
	if (filters.category) {
		params.category = filters.category;
	}
	params.page = filters.page;
	params.perPage = filters.perPage;
	params.sortBy = filters.sortBy;
	params.sortOrder = filters.sortOrder;
	params.excludeDone = false;

	return safeInvoke<PaginatedTasksResult>("tasks_list_full_paginated", params).catch(() => ({
		items: [],
		total: 0,
		page: 1,
		perPage: 20,
		totalPages: 0,
	}));
}

async function fetchActiveExecutions(): Promise<Map<string, TaskExecution>> {
	const executions = await safeInvoke<TaskExecution[]>("get_all_active_executions").catch(() => []);
	const executionMap = new Map<string, TaskExecution>();
	for (const exec of executions) {
		executionMap.set(exec.task_id, exec);
	}
	return executionMap;
}

interface UseGetTaskDataOptions {
	filters: TaskQueryFilters;
}

interface TaskDataResult {
	tasks: TaskFull[];
	taskFullCache: Map<string, TaskFull>;
	activeExecutions: Map<string, TaskExecution>;
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
	getSubtasks: (taskId: string) => TaskFull["subtasks"];
	pagination: {
		page: number;
		perPage: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
}

export function useGetTaskData({ filters }: UseGetTaskDataOptions): TaskDataResult {
	const queryClient = useQueryClient();
	
	const changeCounter = useDbRefetchStore((s) => s.changeCounter);
	const lastChange = useDbRefetchStore((s) => s.lastChange);

	const tasksQuery = useQuery({
		queryKey: [...TASKS_FULL_QUERY_KEY, filters],
		queryFn: () => fetchTasksFullPaginated(filters),
		staleTime: 30_000,
		refetchOnMount: "always",
	});

	const executionsQuery = useQuery({
		queryKey: [...EXECUTIONS_QUERY_KEY],
		queryFn: fetchActiveExecutions,
		staleTime: 5_000,
		refetchOnMount: "always",
		refetchInterval: 10_000,
	});

	const paginatedResult = tasksQuery.data ?? { items: [], total: 0, page: 1, perPage: 20, totalPages: 0 };
	const activeExecutions = executionsQuery.data ?? new Map<string, TaskExecution>();

	const taskFullCache = useMemo(() => {
		const cache = new Map<string, TaskFull>();
		for (const task of paginatedResult.items) {
			cache.set(task.id, task);
		}
		return cache;
	}, [paginatedResult.items]);

	useEffect(() => {
		if (changeCounter === 0) return;
		
		const shouldRefetch = !lastChange || 
			lastChange.entity_type === "task" || 
			lastChange.entity_type === "subtask";
		
		if (shouldRefetch) {
			queryClient.invalidateQueries({ queryKey: TASKS_FULL_QUERY_KEY });
			queryClient.invalidateQueries({ queryKey: EXECUTIONS_QUERY_KEY });
		}
	}, [changeCounter, lastChange, queryClient]);

	useEffect(() => {
		let unlistenTask: (() => void) | null = null;
		let unlistenExecution: (() => void) | null = null;

		safeListen<TaskUpdatedPayload>("task-updated", () => {
			queryClient.invalidateQueries({ queryKey: TASKS_FULL_QUERY_KEY });
		}).then((fn) => {
			unlistenTask = fn;
		});

		safeListen("execution-changed", () => {
			queryClient.invalidateQueries({ queryKey: EXECUTIONS_QUERY_KEY });
		}).then((fn) => {
			unlistenExecution = fn;
		});

		return () => {
			unlistenTask?.();
			unlistenExecution?.();
		};
	}, [queryClient]);

	const getSubtasks = useCallback(
		(taskId: string) => taskFullCache.get(taskId)?.subtasks || [],
		[taskFullCache],
	);

	const refetch = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: TASKS_FULL_QUERY_KEY });
		queryClient.invalidateQueries({ queryKey: EXECUTIONS_QUERY_KEY });
	}, [queryClient]);

	const pagination = useMemo(() => ({
		page: paginatedResult.page,
		perPage: paginatedResult.perPage,
		total: paginatedResult.total,
		totalPages: paginatedResult.totalPages,
		hasNextPage: paginatedResult.page < paginatedResult.totalPages,
		hasPrevPage: paginatedResult.page > 1,
	}), [paginatedResult]);

	return {
		tasks: paginatedResult.items,
		taskFullCache,
		activeExecutions,
		isLoading: tasksQuery.isLoading,
		isError: tasksQuery.isError,
		refetch,
		getSubtasks,
		pagination,
	};
}

export function useProjectPath(projectId: string | null) {
	return useQuery({
		queryKey: ["projectPath", projectId],
		queryFn: async () => {
			if (!projectId) return null;
			const project = await safeInvoke<ProjectWithConfig>(
				"get_project_with_config",
				{ projectId },
			).catch(() => null);
			return project?.path ?? null;
		},
		enabled: !!projectId,
		staleTime: 60_000,
	});
}
