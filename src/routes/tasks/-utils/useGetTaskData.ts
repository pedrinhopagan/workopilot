import { useCallback, useEffect, useMemo } from "react";
import { safeListen } from "../../../services/tauri";
import { trpc } from "../../../services/trpc";
import { useDbRefetchStore } from "../../../stores/dbRefetch";
import type {
	TaskExecution,
	TaskFull,
	TaskUpdatedPayload,
} from "../../../types";
import type { TaskQueryFilters } from "./useGetTaskQuery";

export const TASKS_FULL_QUERY_KEY = ["tasksFull"] as const;
export const EXECUTIONS_QUERY_KEY = ["activeExecutions"] as const;

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

export function useGetTaskData({
	filters,
}: UseGetTaskDataOptions): TaskDataResult {
	const utils = trpc.useUtils();

	const changeCounter = useDbRefetchStore((s) => s.changeCounter);
	const lastChange = useDbRefetchStore((s) => s.lastChange);

	const tasksQuery = trpc.tasks.listFullPaginated.useQuery(
		{
			projectId: filters.projectId ?? undefined,
			priority: filters.priority as 1 | 2 | 3 | undefined,
			category: filters.category as
				| "feature"
				| "bug"
				| "refactor"
				| "research"
				| "documentation"
				| undefined,
			q: filters.q ?? undefined,
			page: filters.page,
			perPage: filters.perPage,
			sortBy: filters.sortBy,
			sortOrder: filters.sortOrder,
			excludeDone: false,
		},
		{
			staleTime: 30_000,
			refetchOnMount: "always",
		},
	);

	const executionsQuery = trpc.executions.listAllActive.useQuery(undefined, {
		staleTime: 5_000,
		refetchOnMount: "always",
		refetchInterval: 10_000,
	});

	const paginatedResult = tasksQuery.data ?? {
		items: [],
		total: 0,
		page: 1,
		perPage: 20,
		totalPages: 0,
	};

	const activeExecutions = useMemo(() => {
		const executionMap = new Map<string, TaskExecution>();
		const executions = executionsQuery.data ?? [];
		for (const exec of executions) {
			executionMap.set(exec.task_id, exec);
		}
		return executionMap;
	}, [executionsQuery.data]);

	const taskFullCache = useMemo(() => {
		const cache = new Map<string, TaskFull>();
		for (const task of paginatedResult.items) {
			cache.set(task.id, task);
		}
		return cache;
	}, [paginatedResult.items]);

	useEffect(() => {
		if (changeCounter === 0) return;

		const shouldRefetch =
			!lastChange ||
			lastChange.entity_type === "task" ||
			lastChange.entity_type === "subtask";

		if (shouldRefetch) {
			utils.tasks.listFullPaginated.invalidate();
			utils.executions.listAllActive.invalidate();
		}
	}, [changeCounter, lastChange, utils]);

	useEffect(() => {
		let unlistenTask: (() => void) | null = null;
		let unlistenExecution: (() => void) | null = null;

		safeListen<TaskUpdatedPayload>("task-updated", () => {
			utils.tasks.listFullPaginated.invalidate();
		}).then((fn) => {
			unlistenTask = fn;
		});

		safeListen("execution-changed", () => {
			utils.executions.listAllActive.invalidate();
		}).then((fn) => {
			unlistenExecution = fn;
		});

		return () => {
			unlistenTask?.();
			unlistenExecution?.();
		};
	}, [utils]);

	const getSubtasks = useCallback(
		(taskId: string) => taskFullCache.get(taskId)?.subtasks || [],
		[taskFullCache],
	);

	const refetch = useCallback(() => {
		utils.tasks.listFullPaginated.invalidate();
		utils.executions.listAllActive.invalidate();
	}, [utils]);

	const pagination = useMemo(
		() => ({
			page: paginatedResult.page,
			perPage: paginatedResult.perPage,
			total: paginatedResult.total,
			totalPages: paginatedResult.totalPages,
			hasNextPage: paginatedResult.page < paginatedResult.totalPages,
			hasPrevPage: paginatedResult.page > 1,
		}),
		[paginatedResult],
	);

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
	const projectQuery = trpc.projects.get.useQuery(
		{ id: projectId ?? "" },
		{
			enabled: !!projectId,
			staleTime: 60_000,
		},
	);

	return {
		data: projectQuery.data?.path ?? null,
		isLoading: projectQuery.isLoading,
		isError: projectQuery.isError,
	};
}
