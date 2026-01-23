import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	getTaskDerivedStatus,
} from "../../../lib/constants/taskStatus";
import { safeInvoke, safeListen } from "../../../services/tauri";
import type {
	ProjectWithConfig,
	Task,
	TaskExecution,
	TaskFull,
	TaskUpdatedPayload,
} from "../../../types";
import type { TaskQueryFilters } from "./useGetTaskQuery";

export const TASKS_QUERY_KEY = ["tasks"] as const;
export const TASK_FULL_QUERY_KEY = ["taskFull"] as const;
export const EXECUTIONS_QUERY_KEY = ["activeExecutions"] as const;

async function fetchTasks(): Promise<Task[]> {
	return safeInvoke<Task[]>("get_tasks").catch(() => []);
}

async function fetchActiveExecutions(): Promise<Map<string, TaskExecution>> {
	const executions = await safeInvoke<TaskExecution[]>("get_all_active_executions").catch(() => []);
	const executionMap = new Map<string, TaskExecution>();
	for (const exec of executions) {
		executionMap.set(exec.task_id, exec);
	}
	return executionMap;
}

async function fetchTaskFull(taskId: string, projectPath: string): Promise<TaskFull | null> {
	return safeInvoke<TaskFull>("get_task_full", {
		projectPath,
		taskId,
	}).catch(() => null);
}

interface UseGetTaskDataOptions {
	filters: TaskQueryFilters;
}

interface TaskDataResult {
	tasks: Task[];
	taskFullCache: Map<string, TaskFull>;
	activeExecutions: Map<string, TaskExecution>;
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
	getSubtasks: (taskId: string) => TaskFull["subtasks"];
	pendingTasks: Task[];
	doneTasks: Task[];
}

export function useGetTaskData({ filters }: UseGetTaskDataOptions): TaskDataResult {
	const queryClient = useQueryClient();
	const tasksRef = useRef<Task[]>([]);
	const taskFullCacheRef = useRef<Map<string, TaskFull>>(new Map());

	const tasksQuery = useQuery({
		queryKey: [...TASKS_QUERY_KEY],
		queryFn: fetchTasks,
		staleTime: 30_000,
	});

	const executionsQuery = useQuery({
		queryKey: [...EXECUTIONS_QUERY_KEY],
		queryFn: fetchActiveExecutions,
		staleTime: 5_000,
		refetchInterval: 10_000,
	});

	const tasks = tasksQuery.data ?? [];
	const activeExecutions = executionsQuery.data ?? new Map<string, TaskExecution>();

	useEffect(() => {
		tasksRef.current = tasks;
	}, [tasks]);

	const loadTaskFulls = useCallback(async () => {
		const newCache = new Map<string, TaskFull>();
		
		for (const task of tasks) {
			if (task.project_id) {
				const project = await safeInvoke<ProjectWithConfig>(
					"get_project_with_config",
					{ projectId: task.project_id },
				).catch(() => null);
				
				if (project) {
					const full = await fetchTaskFull(task.id, project.path);
					if (full) {
						newCache.set(task.id, full);
					}
				}
			}
		}
		
		taskFullCacheRef.current = newCache;
	}, [tasks]);

	useEffect(() => {
		if (tasks.length > 0) {
			loadTaskFulls();
		}
	}, [tasks, loadTaskFulls]);

	useEffect(() => {
		let unlistenTask: (() => void) | null = null;
		let unlistenExecution: (() => void) | null = null;

		safeListen<TaskUpdatedPayload>("task-updated", async (event) => {
			if (event.payload.source === "ai") {
				const taskId = event.payload.task_id;
				const task = tasksRef.current.find((t) => t.id === taskId);
				
				if (task?.project_id) {
					const project = await safeInvoke<ProjectWithConfig>(
						"get_project_with_config",
						{ projectId: task.project_id },
					).catch(() => null);
					
					if (project) {
						const taskFull = await fetchTaskFull(taskId, project.path);
						if (taskFull) {
							await safeInvoke("update_task_and_sync", {
								projectPath: project.path,
								task: taskFull,
							}).catch(() => null);
							
							taskFullCacheRef.current = new Map(taskFullCacheRef.current).set(taskId, taskFull);
							queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
						}
					}
				}
			}
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

	const filteredTasks = useMemo(() => {
		let result = filters.projectId
			? tasks.filter((t) => t.project_id === filters.projectId)
			: tasks;

		if (filters.priority) {
			result = result.filter((t) => t.priority === filters.priority);
		}
		
		if (filters.category) {
			result = result.filter((t) => t.category === filters.category);
		}
		
		if (filters.status) {
			result = result.filter((t) => {
				const full = taskFullCacheRef.current.get(t.id);
				const state = getTaskDerivedStatus(full || null);
				return state === filters.status;
			});
		}

		return result;
	}, [tasks, filters]);

	const pendingTasks = useMemo(() => {
		const pending = filteredTasks.filter((t) => t.status !== "done");
		
		return pending.sort((a, b) => {
			const aActive = a.status === "active";
			const bActive = b.status === "active";
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;

			const aExecuting = activeExecutions.has(a.id);
			const bExecuting = activeExecutions.has(b.id);
			if (aExecuting && !bExecuting) return -1;
			if (!aExecuting && bExecuting) return 1;

			return 0;
		});
	}, [filteredTasks, activeExecutions]);

	const doneTasks = useMemo(
		() => filteredTasks.filter((t) => t.status === "done"),
		[filteredTasks],
	);

	const getSubtasks = useCallback(
		(taskId: string) => taskFullCacheRef.current.get(taskId)?.subtasks || [],
		[],
	);

	const refetch = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
		queryClient.invalidateQueries({ queryKey: EXECUTIONS_QUERY_KEY });
	}, [queryClient]);

	return {
		tasks: filteredTasks,
		taskFullCache: taskFullCacheRef.current,
		activeExecutions,
		isLoading: tasksQuery.isLoading,
		isError: tasksQuery.isError,
		refetch,
		getSubtasks,
		pendingTasks,
		doneTasks,
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
