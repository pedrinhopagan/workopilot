import { memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, SortAsc, SortDesc, Filter, X } from "lucide-react";

export type ProjectSortBy = "name" | "activity" | "pending_tasks" | "created_at";
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

const sortOptions: { value: ProjectSortBy; label: string }[] = [
	{ value: "name", label: "Nome" },
	{ value: "activity", label: "Atividade" },
	{ value: "pending_tasks", label: "Tarefas Pendentes" },
	{ value: "created_at", label: "Data de Criacao" },
];

const statusOptions: { value: ProjectStatusFilter; label: string }[] = [
	{ value: "all", label: "Todos" },
	{ value: "active", label: "Ativos" },
	{ value: "archived", label: "Arquivados" },
];

export const ProjectsFilterBar = memo(function ProjectsFilterBar({
	filters,
	onFiltersChange,
}: ProjectsFilterBarProps) {
	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onFiltersChange({ ...filters, search: e.target.value });
		},
		[filters, onFiltersChange]
	);

	const handleClearSearch = useCallback(() => {
		onFiltersChange({ ...filters, search: "" });
	}, [filters, onFiltersChange]);

	const handleSortByChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			onFiltersChange({ ...filters, sortBy: e.target.value as ProjectSortBy });
		},
		[filters, onFiltersChange]
	);

	const handleToggleSortOrder = useCallback(() => {
		onFiltersChange({
			...filters,
			sortOrder: filters.sortOrder === "asc" ? "desc" : "asc",
		});
	}, [filters, onFiltersChange]);

	const handleStatusChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) => {
			onFiltersChange({ ...filters, status: e.target.value as ProjectStatusFilter });
		},
		[filters, onFiltersChange]
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
				<select
					value={filters.status}
					onChange={handleStatusChange}
					className={cn(
						"h-8 px-3 text-sm bg-card/50 border border-border/60 text-foreground",
						"focus:outline-none focus:border-primary cursor-pointer appearance-none",
						"pr-8"
					)}
					style={{
						backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27hsl(130 3%25 52%25)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')`,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "right 0.5rem center",
						backgroundSize: "1em",
					}}
				>
					{statusOptions.map((opt) => (
						<option key={opt.value} value={opt.value} className="bg-background text-foreground">
							{opt.label}
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-1">
				<select
					value={filters.sortBy}
					onChange={handleSortByChange}
					className={cn(
						"h-8 px-3 text-sm bg-card/50 border border-border/60 text-foreground",
						"focus:outline-none focus:border-primary cursor-pointer appearance-none",
						"pr-8"
					)}
					style={{
						backgroundImage: `url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27hsl(130 3%25 52%25)%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')`,
						backgroundRepeat: "no-repeat",
						backgroundPosition: "right 0.5rem center",
						backgroundSize: "1em",
					}}
				>
					{sortOptions.map((opt) => (
						<option key={opt.value} value={opt.value} className="bg-background text-foreground">
							{opt.label}
						</option>
					))}
				</select>

				<button
					type="button"
					onClick={handleToggleSortOrder}
					className={cn(
						"h-8 w-8 flex items-center justify-center",
						"bg-card/50 border border-border/60 text-muted-foreground",
						"hover:text-foreground hover:border-primary/50 transition-colors"
					)}
					title={filters.sortOrder === "asc" ? "Ordenar crescente" : "Ordenar decrescente"}
				>
					{filters.sortOrder === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />}
				</button>
			</div>

			{hasActiveFilters && (
				<div className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Filtros ativos" />
			)}
		</div>
	);
});
