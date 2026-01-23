import { useCallback, useMemo, useState } from "react";

export interface TaskQueryFilters {
	projectId: string | null;
	priority: number | null;
	category: string | null;
	status: string | null;
}

export interface TaskQueryState {
	filters: TaskQueryFilters;
	setProjectFilter: (projectId: string | null) => void;
	setPriorityFilter: (priority: number | null) => void;
	setCategoryFilter: (category: string | null) => void;
	setStatusFilter: (status: string | null) => void;
	clearFilters: () => void;
	hasActiveFilters: boolean;
}

const defaultFilters: TaskQueryFilters = {
	projectId: null,
	priority: null,
	category: null,
	status: null,
};

export function useGetTaskQuery(initialProjectId: string | null = null): TaskQueryState {
	const [filters, setFilters] = useState<TaskQueryFilters>({
		...defaultFilters,
		projectId: initialProjectId,
	});

	const setProjectFilter = useCallback((projectId: string | null) => {
		setFilters((prev) => ({ ...prev, projectId }));
	}, []);

	const setPriorityFilter = useCallback((priority: number | null) => {
		setFilters((prev) => ({ ...prev, priority }));
	}, []);

	const setCategoryFilter = useCallback((category: string | null) => {
		setFilters((prev) => ({ ...prev, category }));
	}, []);

	const setStatusFilter = useCallback((status: string | null) => {
		setFilters((prev) => ({ ...prev, status }));
	}, []);

	const clearFilters = useCallback(() => {
		setFilters((prev) => ({
			...defaultFilters,
			projectId: prev.projectId,
		}));
	}, []);

	const hasActiveFilters = useMemo(() => {
		return filters.priority !== null || filters.category !== null || filters.status !== null;
	}, [filters.priority, filters.category, filters.status]);

	return {
		filters,
		setProjectFilter,
		setPriorityFilter,
		setCategoryFilter,
		setStatusFilter,
		clearFilters,
		hasActiveFilters,
	};
}

export const TASK_CATEGORIES = ["feature", "bug", "refactor", "test", "docs"] as const;

export const TASK_PRIORITIES = [
	{ value: 1, label: "Alta", color: "bg-[#bc5653]" },
	{ value: 2, label: "Média", color: "bg-[#ebc17a]" },
	{ value: 3, label: "Baixa", color: "bg-[#8b7355]" },
] as const;

export function getCategoryOptions() {
	return TASK_CATEGORIES.map((c) => ({ value: c, label: c }));
}

export function getPriorityOptions() {
	return TASK_PRIORITIES.map((p) => ({ value: String(p.value), label: p.label }));
}

export function getPriorityColor(priority: number): string {
	const p = TASK_PRIORITIES.find((pr) => pr.value === priority);
	return p?.color || "bg-[#8b7355]";
}
