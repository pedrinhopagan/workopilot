import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import type { TaskProgressState } from "../../../lib/constants/taskProgressState";
import type { TasksSearch } from "../../../lib/searchSchemas";
import { cleanSearch, updateTasksSearch } from "../../../lib/searchSchemas";

export interface TaskQueryFilters {
	projectId: string | null;
	priority: number | null;
	category: string | null;
	progressState: TaskProgressState | null;
	q: string | null;
	page: number;
	perPage: number;
	sortBy: "priority" | "created_at" | "title" | "progress_state";
	sortOrder: "asc" | "desc";
}

export interface TaskQueryState {
	filters: TaskQueryFilters;
	search: TasksSearch;
	setProjectFilter: (projectId: string | null) => void;
	setPriorityFilter: (priority: number | null) => void;
	setCategoryFilter: (category: string | null) => void;
	setProgressStateFilter: (progressState: TaskProgressState | null) => void;
	setSearchQuery: (q: string | null) => void;
	setPage: (page: number) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
	updateSearch: (updates: Partial<TasksSearch>) => void;
}

export function useGetTaskQuery(
	initialProjectId: string | null = null,
): TaskQueryState {
	const search = useSearch({ from: "/tasks/" });
	const navigate = useNavigate();

	const filters: TaskQueryFilters = useMemo(
		() => ({
			projectId: initialProjectId,
			priority: search.priority ?? null,
			category: search.category ?? null,
			progressState: search.progressState ?? null,
			q: search.q ?? null,
			page: search.page ?? 1,
			perPage: search.perPage ?? 20,
			sortBy: search.sortBy ?? "progress_state",
			sortOrder: search.sortOrder ?? "asc",
		}),
		[initialProjectId, search],
	);

	const updateSearchParams = useCallback(
		(updates: Partial<TasksSearch>) => {
			const newSearch = updateTasksSearch(search as TasksSearch, updates);
			navigate({
				to: "/tasks",
				search: (prev) => ({ ...prev, ...cleanSearch(newSearch) }),
				replace: true,
			});
		},
		[search, navigate],
	);

	const setProjectFilter = useCallback((_projectId: string | null) => {}, []);

	const setPriorityFilter = useCallback(
		(priority: number | null) => {
			updateSearchParams({ priority: priority ?? undefined });
		},
		[updateSearchParams],
	);

	const setCategoryFilter = useCallback(
		(category: string | null) => {
			updateSearchParams({ category: category as TasksSearch["category"] });
		},
		[updateSearchParams],
	);

	const setProgressStateFilter = useCallback(
		(progressState: TaskProgressState | null) => {
			updateSearchParams({ progressState: progressState ?? undefined });
		},
		[updateSearchParams],
	);

	const setSearchQuery = useCallback(
		(q: string | null) => {
			updateSearchParams({ q: q ?? undefined });
		},
		[updateSearchParams],
	);

	const setPage = useCallback(
		(page: number) => {
			updateSearchParams({ page });
		},
		[updateSearchParams],
	);

	const clearFilters = useCallback(() => {
		navigate({
			to: "/tasks",
			search: () => ({}),
			replace: true,
		});
	}, [navigate]);

	const hasActiveFilters = useMemo(() => {
		return (
			search.priority !== undefined ||
			search.category !== undefined ||
			search.progressState !== undefined ||
			search.q !== undefined
		);
	}, [search.priority, search.category, search.progressState, search.q]);

	return {
		filters,
		search: search as TasksSearch,
		setProjectFilter,
		setPriorityFilter,
		setCategoryFilter,
		setProgressStateFilter,
		setSearchQuery,
		setPage,
		clearFilters,
		hasActiveFilters,
		updateSearch: updateSearchParams,
	};
}

export const TASK_CATEGORIES = [
	"feature",
	"bug",
	"refactor",
	"research",
	"documentation",
] as const;

export const TASK_PRIORITIES = [
	{ value: 1, label: "Alta", color: "bg-[#bc5653]" },
	{ value: 2, label: "Media", color: "bg-[#ebc17a]" },
	{ value: 3, label: "Baixa", color: "bg-[#8b7355]" },
] as const;

export function getCategoryOptions() {
	return TASK_CATEGORIES.map((c) => ({ value: c, label: c }));
}

export function getPriorityOptions() {
	return TASK_PRIORITIES.map((p) => ({
		value: String(p.value),
		label: p.label,
	}));
}

export function getPriorityColor(priority: number): string {
	const p = TASK_PRIORITIES.find((pr) => pr.value === priority);
	return p?.color || "bg-[#8b7355]";
}
