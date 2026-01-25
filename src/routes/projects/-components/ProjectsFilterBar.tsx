import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	Check,
	ChevronDown,
	Filter,
	Search,
	SortAsc,
	SortDesc,
	X,
} from "lucide-react";
import { memo, useCallback } from "react";

export type ProjectSortBy =
	| "name"
	| "activity"
	| "pending_tasks"
	| "created_at";
export type ProjectSortOrder = "asc" | "desc";
export type ProjectStatusFilter = "all" | "active" | "archived";

export type ProjectFilters = {
	search: string;
	sortBy: ProjectSortBy;
	sortOrder: ProjectSortOrder;
	status: ProjectStatusFilter;
};

type ProjectsFilterBarProps = {
	filters: ProjectFilters;
	onFiltersChange: (filters: ProjectFilters) => void;
};

const sortOptions = [
	{ id: "name", name: "Nome" },
	{ id: "activity", name: "Atividade" },
	{ id: "pending_tasks", name: "Tarefas Pendentes" },
	{ id: "created_at", name: "Data de Criacao" },
];

const statusOptions = [
	{ id: "all", name: "Todos" },
	{ id: "active", name: "Ativos" },
	{ id: "archived", name: "Arquivados" },
];

export const ProjectsFilterBar = memo(function ProjectsFilterBar({
	filters,
	onFiltersChange,
}: ProjectsFilterBarProps) {
	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onFiltersChange({ ...filters, search: e.target.value });
		},
		[filters, onFiltersChange],
	);

	const handleClearSearch = useCallback(() => {
		onFiltersChange({ ...filters, search: "" });
	}, [filters, onFiltersChange]);

	const handleSortByChange = useCallback(
		(value: string) => {
			onFiltersChange({ ...filters, sortBy: value as ProjectSortBy });
		},
		[filters, onFiltersChange],
	);

	const handleToggleSortOrder = useCallback(() => {
		onFiltersChange({
			...filters,
			sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
		});
	}, [filters, onFiltersChange]);

	const handleStatusChange = useCallback(
		(value: string) => {
			onFiltersChange({ ...filters, status: value as ProjectStatusFilter });
		},
		[filters, onFiltersChange],
	);

	const hasActiveFilters = filters.search || filters.status !== "all";

	return (
		<div className="flex items-center gap-3 mb-5 animate-fade-in">
			<div className="relative flex-1 max-w-xs">
				<Search
					size={14}
					className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
				/>
				<Input
					type="text"
					placeholder="Buscar projetos..."
					value={filters.search}
					onChange={handleSearchChange}
					className="pl-9 pr-8 h-8 text-sm bg-card/50 border-border/60"
				/>
				{filters.search && (
					<button
						type="button"
						onClick={handleClearSearch}
						className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
						aria-label="Limpar busca"
					>
						<X size={12} />
					</button>
				)}
			</div>

			<div className="flex items-center gap-2">
				<Filter size={14} className="text-muted-foreground" />
				<CustomSelect
					items={statusOptions}
					value={filters.status}
					onValueChange={handleStatusChange}
					triggerClassName="flex items-center gap-2 px-3 py-1 h-8 border border-border/60 bg-card/50 rounded-md min-w-[100px] hover:bg-popover hover:border-muted-foreground transition-colors"
					contentClassName="min-w-[120px]"
					renderTrigger={() => {
						const selected = statusOptions.find((s) => s.id === filters.status);
						return (
							<>
								<span className="flex-1 text-sm text-foreground truncate text-left">
									{selected?.name || "Status"}
								</span>
								<ChevronDown className="size-3 text-muted-foreground shrink-0" />
							</>
						);
					}}
					renderItem={(item, isSelected) => (
						<div
							className={cn(
								"flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
								isSelected ? "bg-popover" : "hover:bg-popover",
							)}
						>
							<span
								className={cn(
									"flex-1 text-sm truncate",
									isSelected
										? "text-foreground font-medium"
										: "text-foreground",
								)}
							>
								{item.name}
							</span>
							{isSelected && <Check className="size-3 text-primary shrink-0" />}
						</div>
					)}
				/>
			</div>

			<div className="flex items-center gap-1">
				<CustomSelect
					items={sortOptions}
					value={filters.sortBy}
					onValueChange={handleSortByChange}
					triggerClassName="flex items-center gap-2 px-3 py-1 h-8 border border-border/60 bg-card/50 rounded-md min-w-[140px] hover:bg-popover hover:border-muted-foreground transition-colors"
					contentClassName="min-w-[160px]"
					renderTrigger={() => {
						const selected = sortOptions.find((s) => s.id === filters.sortBy);
						return (
							<>
								<span className="flex-1 text-sm text-foreground truncate text-left">
									{selected?.name || "Ordenar"}
								</span>
								<ChevronDown className="size-3 text-muted-foreground shrink-0" />
							</>
						);
					}}
					renderItem={(item, isSelected) => (
						<div
							className={cn(
								"flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
								isSelected ? "bg-popover" : "hover:bg-popover",
							)}
						>
							<span
								className={cn(
									"flex-1 text-sm truncate",
									isSelected
										? "text-foreground font-medium"
										: "text-foreground",
								)}
							>
								{item.name}
							</span>
							{isSelected && <Check className="size-3 text-primary shrink-0" />}
						</div>
					)}
				/>

				<button
					type="button"
					onClick={handleToggleSortOrder}
					className={cn(
						"h-8 w-8 flex items-center justify-center",
						"bg-card/50 border border-border/60 text-muted-foreground",
						"hover:text-foreground hover:border-primary/50 transition-colors",
					)}
					title={
						filters.sortOrder === "asc"
							? "Ordenar crescente"
							: "Ordenar decrescente"
					}
				>
					{filters.sortOrder === "asc" ? (
						<SortAsc size={14} />
					) : (
						<SortDesc size={14} />
					)}
				</button>
			</div>

			{hasActiveFilters && (
				<div
					className="h-2 w-2 rounded-full bg-primary animate-pulse"
					title="Filtros ativos"
				/>
			)}
		</div>
	);
});
