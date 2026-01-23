import { Select } from "../../../components/Select";
import { getStatusFilterOptions } from "../../../lib/constants/taskStatus";
import { getCategoryOptions, getPriorityOptions, type TaskQueryState } from "../-utils/useGetTaskQuery";

type TasksHeaderProps = {
	queryState: TaskQueryState;
	onNewTaskClick: () => void;
	canCreateTask: boolean;
};

export function TasksHeader({ queryState, onNewTaskClick, canCreateTask }: TasksHeaderProps) {
	const { filters, setCategoryFilter, setPriorityFilter, setStatusFilter, clearFilters, hasActiveFilters } = queryState;

	return (
		<>
			{/* New Task Button Row */}
			<div className="flex items-center gap-2 p-3 border-b border-[#3d3a34]">
				<button
					type="button"
					onClick={onNewTaskClick}
					disabled={!canCreateTask}
					className="flex-1 px-3 py-2 bg-[#1c1c1c] border border-[#3d3a34] text-[#636363] text-sm text-left hover:border-[#909d63] hover:text-[#d6d6d6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{canCreateTask ? "Nova tarefa..." : "Selecione um projeto para adicionar tarefas"}
				</button>
				<button
					type="button"
					onClick={onNewTaskClick}
					disabled={!canCreateTask}
					className="px-4 py-2 bg-[#909d63] text-[#1c1c1c] text-sm hover:bg-[#a0ad73] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					+ Nova
				</button>
			</div>

			{/* Filters Row */}
			<div className="flex items-center gap-2 p-3 bg-[#1c1c1c] border-b border-[#3d3a34]">
				<div className="flex-1" />
				<Select
					value={filters.category || ""}
					onChange={(v) => setCategoryFilter(v || null)}
					options={[{ value: "", label: "Categoria" }, ...getCategoryOptions()]}
				/>
				<Select
					value={filters.priority ? String(filters.priority) : ""}
					onChange={(v) => setPriorityFilter(v ? parseInt(v) : null)}
					options={[
						{ value: "", label: "Prioridade" },
						...getPriorityOptions(),
					]}
				/>
				<Select
					value={filters.status || ""}
					onChange={(v) => setStatusFilter(v || null)}
					options={[
						{ value: "", label: "Status" },
						...getStatusFilterOptions(),
					]}
				/>
				{hasActiveFilters && (
					<button
						type="button"
						onClick={clearFilters}
						className="px-3 py-2 text-xs text-[#636363] hover:text-[#d6d6d6] transition-colors"
					>
						Limpar
					</button>
				)}
			</div>
		</>
	);
}
