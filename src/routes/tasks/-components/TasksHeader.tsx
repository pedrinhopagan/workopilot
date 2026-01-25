import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import {
	getProgressStateFilterOptions,
	PROGRESS_STATE_COLORS,
} from "@/lib/constants/taskStatus";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	TASK_CATEGORIES,
	TASK_PRIORITIES,
	type TaskQueryState,
} from "../-utils/useGetTaskQuery";

type TasksHeaderProps = {
	queryState: TaskQueryState;
};

export function TasksHeader({ queryState }: TasksHeaderProps) {
	const {
		filters,
		setCategoryFilter,
		setPriorityFilter,
		setProgressStateFilter,
		setSearchQuery,
		clearFilters,
		hasActiveFilters,
	} = queryState;
	const [searchValue, setSearchValue] = useState(filters.q || "");

	useEffect(() => {
		setSearchValue(filters.q || "");
	}, [filters.q]);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchValue(e.target.value);
		},
		[],
	);

	const handleSearchKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				setSearchQuery(searchValue.trim() || null);
			}
		},
		[searchValue, setSearchQuery],
	);

	const handleSearchClear = useCallback(() => {
		setSearchValue("");
		setSearchQuery(null);
	}, [setSearchQuery]);

	const categoryItems = [
		{ id: "__all__", label: "Categoria" },
		...TASK_CATEGORIES.map((c) => ({ id: c, label: c })),
	];

	const priorityItems = [
		{ id: "__all__", label: "Prioridade", color: null as string | null },
		...TASK_PRIORITIES.map((p) => ({
			id: String(p.value),
			label: p.label,
			color: p.color.replace("bg-[", "").replace("]", ""),
		})),
	];

	const progressStateOptions = getProgressStateFilterOptions();
	const progressStateItems = [
		{ id: "__all__", label: "Estado", color: null as string | null },
		...progressStateOptions.map((opt) => ({
			id: opt.value,
			label: opt.label,
			color:
				PROGRESS_STATE_COLORS[opt.value as keyof typeof PROGRESS_STATE_COLORS],
		})),
	];

	return (
		<div className="flex items-center gap-2 p-3 bg-background border-b border-border">
			<div className="relative flex-1 max-w-xs">
				<Search
					size={14}
					className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
				/>
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

			<CustomSelect
				items={categoryItems}
				value={filters.category || "__all__"}
				onValueChange={(id) => setCategoryFilter(id === "__all__" ? null : id)}
				triggerClassName="flex items-center gap-2 px-2 py-1 h-8 border border-border bg-card rounded-md min-w-[100px] hover:bg-popover hover:border-muted-foreground transition-colors"
				contentClassName="min-w-[140px]"
				renderTrigger={() => {
					const selected = categoryItems.find(
						(c) => c.id === (filters.category || "__all__"),
					);
					return (
						<>
							<span className="flex-1 text-sm text-foreground truncate text-left">
								{selected?.label || "Categoria"}
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
								isSelected ? "text-foreground font-medium" : "text-foreground",
							)}
						>
							{item.label}
						</span>
						{isSelected && <Check className="size-3 text-primary shrink-0" />}
					</div>
				)}
			/>

			<CustomSelect
				items={priorityItems}
				value={filters.priority ? String(filters.priority) : "__all__"}
				onValueChange={(id) =>
					setPriorityFilter(id === "__all__" ? null : Number.parseInt(id, 10))
				}
				triggerClassName="flex items-center gap-2 px-2 py-1 h-8 border border-border bg-card rounded-md min-w-[100px] hover:bg-popover hover:border-muted-foreground transition-colors"
				contentClassName="min-w-[140px]"
				renderTrigger={() => {
					const selected = priorityItems.find(
						(p) =>
							p.id ===
							(filters.priority ? String(filters.priority) : "__all__"),
					);
					return (
						<>
							{selected?.color && (
								<span
									className="size-2 rounded-full shrink-0"
									style={{ backgroundColor: selected.color }}
								/>
							)}
							<span className="flex-1 text-sm text-foreground truncate text-left">
								{selected?.label || "Prioridade"}
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
						{item.color && (
							<span
								className="size-2 rounded-full shrink-0"
								style={{ backgroundColor: item.color }}
							/>
						)}
						<span
							className={cn(
								"flex-1 text-sm truncate",
								isSelected ? "text-foreground font-medium" : "text-foreground",
							)}
						>
							{item.label}
						</span>
						{isSelected && <Check className="size-3 text-primary shrink-0" />}
					</div>
				)}
			/>

			<CustomSelect
				items={progressStateItems}
				value={filters.progressState || "__all__"}
				onValueChange={(id) =>
					setProgressStateFilter(
						(id === "__all__" ? null : id) as Parameters<
							typeof setProgressStateFilter
						>[0],
					)
				}
				triggerClassName="flex items-center gap-2 px-2 py-1 h-8 border border-border bg-card rounded-md min-w-[100px] hover:bg-popover hover:border-muted-foreground transition-colors"
				contentClassName="min-w-[160px]"
				renderTrigger={() => {
					const selected = progressStateItems.find(
						(s) => s.id === (filters.progressState || "__all__"),
					);
					return (
						<>
							{selected?.color && (
								<span
									className="size-2 rounded-full shrink-0"
									style={{ backgroundColor: selected.color }}
								/>
							)}
							<span className="flex-1 text-sm text-foreground truncate text-left">
								{selected?.label || "Estado"}
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
						{item.color && (
							<span
								className="size-2 rounded-full shrink-0"
								style={{ backgroundColor: item.color }}
							/>
						)}
						<span
							className={cn(
								"flex-1 text-sm truncate",
								isSelected ? "text-foreground font-medium" : "text-foreground",
							)}
						>
							{item.label}
						</span>
						{isSelected && <Check className="size-3 text-primary shrink-0" />}
					</div>
				)}
			/>

			{hasActiveFilters && (
				<Button variant="ghost" size="sm" onClick={clearFilters}>
					Limpar
				</Button>
			)}
		</div>
	);
}
