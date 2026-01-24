import { z } from "zod";
import { TASK_CATEGORIES } from "../routes/tasks/-utils/useGetTaskQuery";

function optionalString() {
	return z.string().optional().catch(undefined);
}

export const taskProgressStateEnum = z.enum([
	'in-execution',
	'ready-to-start',
	'ready-to-review',
	'ai-working',
	'started',
	'idle',
	'done',
] as const);
export const taskCategoryEnum = z.enum(TASK_CATEGORIES);

export const tasksSearchSchema = z.object({
	progressState: taskProgressStateEnum.optional().catch(undefined),
	category: taskCategoryEnum.optional().catch(undefined),
	priority: z.coerce.number().min(1).max(3).optional().catch(undefined),
	q: optionalString(),
	page: z.coerce.number().min(1).optional().catch(1),
	perPage: z.coerce.number().min(10).max(100).optional().catch(20),
	sortBy: z.enum(["priority", "created_at", "title", "progress_state"]).optional().catch("progress_state"),
	sortOrder: z.enum(["asc", "desc"]).optional().catch("asc"),
});

export type TasksSearch = z.infer<typeof tasksSearchSchema>;

export const taskDetailSearchSchema = z.object({
	tab: z.enum(["overview", "subtasks", "context", "history"]).optional().catch("overview"),
	subtaskId: optionalString(),
	edit: z.coerce.boolean().optional().catch(undefined),
});

export type TaskDetailSearch = z.infer<typeof taskDetailSearchSchema>;

export const projectSortByEnum = z.enum(["name", "activity", "pending_tasks", "created_at"]);
export const projectSortOrderEnum = z.enum(["asc", "desc"]);
export const projectStatusFilterEnum = z.enum(["all", "active", "archived"]);

export const projectsSearchSchema = z.object({
	newProject: z.enum(["true", "false"]).optional().catch(undefined),
	projectId: optionalString(),
	tab: z.enum(["dashboard", "settings", "tmux"]).optional().catch("dashboard"),
	q: optionalString(),
	sortBy: projectSortByEnum.optional().catch("activity"),
	sortOrder: projectSortOrderEnum.optional().catch("desc"),
	status: projectStatusFilterEnum.optional().catch("all"),
});

export type ProjectsSearch = z.infer<typeof projectsSearchSchema>;

export const agendaSearchSchema = z.object({
	year: z.coerce.number().min(2020).max(2100).optional().catch(undefined),
	month: z.coerce.number().min(1).max(12).optional().catch(undefined),
	day: z.coerce.number().min(1).max(31).optional().catch(undefined),
	view: z.enum(["month", "week", "day"]).optional().catch("month"),
	projectId: optionalString(),
	progressState: taskProgressStateEnum.optional().catch(undefined),
});

export type AgendaSearch = z.infer<typeof agendaSearchSchema>;

export function cleanSearch<T extends Record<string, unknown>>(search: T): Partial<T> {
	const cleaned: Partial<T> = {};
	for (const [key, value] of Object.entries(search)) {
		if (value !== undefined && value !== null && value !== "") {
			cleaned[key as keyof T] = value as T[keyof T];
		}
	}
	return cleaned;
}

export function updateTasksSearch(
	current: TasksSearch,
	updates: Partial<TasksSearch>,
): TasksSearch {
	const isFilterChange =
		"progressState" in updates ||
		"category" in updates ||
		"priority" in updates ||
		"q" in updates;

	return {
		...current,
		...updates,
		page: isFilterChange ? 1 : (updates.page ?? current.page),
	};
}
