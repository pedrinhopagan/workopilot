import { Search, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/Select";
import { getProgressStateFilterOptions } from "@/lib/constants/taskStatus";
import { getCategoryOptions, getPriorityOptions, type TaskQueryState } from "../-utils/useGetTaskQuery";

type TasksHeaderProps = {
	queryState: TaskQueryState;
	onNewTaskClick: () => void;
	canCreateTask: boolean;
};

export function TasksHeader({ queryState, onNewTaskClick, canCreateTask }: TasksHeaderProps) {
	const { filters, setCategoryFilter, setPriorityFilter, setProgressStateFilter, setSearchQuery, clearFilters, hasActiveFilters } = queryState;
	const [searchValue, setSearchValue] = useState(filters.q || "");

	useEffect(() => {
		setSearchValue(filters.q || "");
	}, [filters.q]);

	const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchValue(e.target.value);
	}, []);

	const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			setSearchQuery(searchValue.trim() || null);
		}
	}, [searchValue, setSearchQuery]);

	const handleSearchClear = useCallback(() => {
		setSearchValue("");
		setSearchQuery(null);
	}, [setSearchQuery]);

	return (
		<>
			<div className="flex items-center gap-2 p-3 border-b border-border">
				<button
					type="button"
					onClick={onNewTaskClick}
					disabled={!canCreateTask}
					className="flex-1 px-3 py-2 bg-background border border-border text-muted-foreground text-sm text-left hover:border-primary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{canCreateTask ? "Nova tarefa..." : "Selecione um projeto para adicionar tarefas"}
				</button>
				<Button onClick={onNewTaskClick} disabled={!canCreateTask}>
					+ Nova
				</Button>
			</div>

			<div className="flex items-center gap-2 p-3 bg-background border-b border-border">
				<div className="relative flex-1 max-w-xs">
					<Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
					<Input
						type="text"
						placeholder="Buscar..."
						value={searchValue}
						onChange={handleSearchChange}
						onKeyDown={handleSearchKeyDown}
						className="pl-8 pr-8 h-8"
					/>
					{searchValue && (
						<button
							type="button"
							onClick={handleSearchClear}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							<X size={14} />
						</button>
					)}
				</div>

				<Select
					value={filters.category || ""}
					onChange={(v) => setCategoryFilter(v || null)}
					options={[{ value: "", label: "Categoria" }, ...getCategoryOptions()]}
				/>

				<Select
					value={filters.priority ? String(filters.priority) : ""}
					onChange={(v) => setPriorityFilter(v ? Number.parseInt(v, 10) : null)}
					options={[{ value: "", label: "Prioridade" }, ...getPriorityOptions()]}
				/>

				<Select
					value={filters.progressState || ""}
					onChange={(v) => setProgressStateFilter((v || null) as Parameters<typeof setProgressStateFilter>[0])}
					options={[{ value: "", label: "Estado" }, ...getProgressStateFilterOptions()]}
				/>

				{hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={clearFilters}>
						Limpar
					</Button>
				)}
			</div>
		</>
	);
}
