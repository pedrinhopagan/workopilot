import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
	getComplexityColor,
	getComplexityLabel,
	getTaskProgressStateBadgeVariant,
	getTaskProgressStateContainerClass,
	getTaskProgressStateIndicator,
	getTaskProgressStateLabel,
} from "@/lib/constants/taskStatus";
import { cn } from "@/lib/utils";
import type { Subtask, Task, TaskExecution, TaskFull } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { Check, ListChecks, Loader2, Trash2 } from "lucide-react";
import { memo } from "react";

export const TASK_ITEM_PRIORITIES = [
	{ value: 1, label: "Alta", color: "bg-[#bc5653]" },
	{ value: 2, label: "Media", color: "bg-[#ebc17a]" },
	{ value: 3, label: "Baixa", color: "bg-[#8b7355]" },
] as const;

export type TaskItemVariant = "full" | "compact";

type TaskItemProps = {
	task: Task;
	taskFull: TaskFull | null;
	variant?: TaskItemVariant;
	execution?: TaskExecution;
	subtasks?: Subtask[];
	projectColor?: string;
	isDone?: boolean;
	isDeleteConfirming?: boolean;
	onToggle: () => void;
	onToggleSubtask?: (subtaskId: string) => void;
	onDelete?: () => void;
	onClick?: () => void;
	disableNavigation?: boolean;
};

export const TaskItem = memo(function TaskItem({
	task,
	taskFull,
	variant = "full",
	execution,
	subtasks = [],
	projectColor,
	isDone = false,
	isDeleteConfirming = false,
	onToggle,
	onToggleSubtask,
	onDelete,
	onClick,
	disableNavigation = false,
}: TaskItemProps) {
	const navigate = useNavigate();

	const isExecuting = execution && execution.status === "running";

	const progressLabel = getTaskProgressStateLabel(taskFull);
	const containerClass = getTaskProgressStateContainerClass(taskFull);
	const badgeVariant = getTaskProgressStateBadgeVariant(taskFull);
	const indicator = getTaskProgressStateIndicator(taskFull);
	const complexity = taskFull?.complexity;

	const showSpinner = isExecuting || indicator === "spinner";

	const doneSubtasks = subtasks.filter((s) => s.status === "done").length;
	const allSubtasksDone =
		subtasks.length > 0 && subtasks.every((s) => s.status === "done");
	const noDoneSubtasks = subtasks.length > 0 && doneSubtasks === 0;

	const lastCompletedSubtask =
		subtasks
			.filter((s) => s.status === "done" && s.completed_at)
			.sort((a, b) => {
				const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
				const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
				return dateB - dateA;
			})[0] || null;

	const nextPendingSubtask =
		subtasks
			.filter((s) => s.status !== "done")
			.sort((a, b) => a.order - b.order)[0] || null;

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleClick();
		}
	}

	function handleClick() {
		if (onClick) {
			onClick();
			return;
		}
		if (!disableNavigation) {
			navigate({ to: "/tasks/$taskId", params: { taskId: task.id } });
		}
	}

	if (isDone) {
		return (
			<div className="flex flex-row gap-1 w-full group">
				{projectColor && (
					<div
						className="w-[3px] shrink-0 rounded-sm"
						style={{
							background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}80 50%, ${projectColor}40 100%)`,
						}}
						aria-hidden="true"
					/>
				)}
				<button
					type="button"
					onClick={handleClick}
					onKeyDown={handleKeyDown}
					className="flex items-center gap-3 px-3 py-2 bg-card border border-transparent hover:border-border hover:bg-secondary/50 transition-colors duration-200 w-full text-left"
				>
					<Checkbox
						checked={isDone}
						onCheckedChange={onToggle}
						className="text-primary shrink-0"
					/>
					<span className="flex-1 text-foreground text-sm line-through text-left">
						{task.title}
					</span>
					<Badge variant="muted" className="shrink-0">
						{task.category}
					</Badge>
					{onDelete && (
						<DeleteButton isConfirming={isDeleteConfirming} onDelete={onDelete} />
					)}
				</button>
			</div>
		);
	}

	if (variant === "compact") {
		return (
			<div className="flex flex-row gap-1 w-full group">
				{projectColor && (
					<div
						className="w-[3px] shrink-0 rounded-sm"
						style={{
							background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}80 50%, ${projectColor}40 100%)`,
						}}
					/>
				)}
				<button
					type="button"
					onClick={handleClick}
					onKeyDown={handleKeyDown}
					className={cn(
						"cursor-pointer border border-transparent w-full transition-colors duration-200",
						"hover:border-border hover:bg-secondary/30",
						containerClass,
						isExecuting && "ring-1 ring-primary",
					)}
				>
					<div className="flex items-center gap-3 px-3 py-2 w-full text-left">
						{showSpinner ? (
							<Loader2
								size={14}
								className="text-chart-4 animate-spin shrink-0"
								aria-label="Carregando"
							/>
						) : (
							<Checkbox
								checked={isDone}
								onCheckedChange={onToggle}
								className="text-muted-foreground hover:text-primary transition-colors shrink-0"
							/>
						)}

						<span className="flex-1 text-foreground text-sm truncate text-left min-w-0">
							{task.title}
						</span>

						<StatusBadge variant={badgeVariant} label={progressLabel} />

						<Badge variant="success" className="shrink-0">
							{task.category}
						</Badge>

						<PriorityBadge priority={task.priority} />
					</div>
				</button>
			</div>
		);
	}

	return (
		<div className="flex flex-row gap-1 w-full group">
			{projectColor && (
				<div
					className="w-[3px] shrink-0 rounded-sm"
					style={{
						background: `linear-gradient(180deg, ${projectColor} 0%, ${projectColor}80 50%, ${projectColor}40 100%)`,
					}}
				/>
			)}
			<button
				type="button"
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				className={cn(
					"cursor-pointer border border-transparent w-full transition-colors duration-200",
					"hover:border-border hover:bg-secondary/30",
					containerClass,
					isExecuting && "ring-1 ring-primary",
				)}
			>
				<div className="flex items-center gap-3 px-3 py-2 w-full text-left">
				{showSpinner ? (
					<Loader2
						size={14}
						className="text-chart-4 animate-spin shrink-0"
						aria-label="Carregando"
					/>
				) : (
					<Checkbox
						checked={isDone}
						onCheckedChange={onToggle}
						className="text-muted-foreground hover:text-primary transition-colors shrink-0"
					/>
				)}

				<span className="flex-1 text-foreground text-sm flex items-center gap-2 text-left min-w-0">
					<span className="truncate">{task.title}</span>
					{isExecuting && execution && (
						<span className="text-xs text-primary opacity-75 shrink-0">
							(Passo {execution.current_step}/{execution.total_steps})
						</span>
					)}
				</span>

				{subtasks.length > 0 && (
					<span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
						<ListChecks size={12} />
						{doneSubtasks}/{subtasks.length}
					</span>
				)}

				{complexity && (
					<span
						className={cn("text-xs shrink-0", getComplexityColor(complexity))}
					>
						{getComplexityLabel(complexity)}
					</span>
				)}

				<StatusBadge variant={badgeVariant} label={progressLabel} />

				<Badge variant="success" className="shrink-0">
					{task.category}
				</Badge>

				<PriorityBadge priority={task.priority} />

				{onDelete && (
					<DeleteButton isConfirming={isDeleteConfirming} onDelete={onDelete} />
				)}
			</div>

			{subtasks.length > 0 && (
				<div className="pl-8 pr-3 pb-2 space-y-1 flex flex-col items-start">
					{allSubtasksDone ? (
						<span className="text-xs text-muted-foreground italic">
							(subtasks concluidas)
						</span>
					) : noDoneSubtasks ? (
						<>
							<span className="text-xs text-muted-foreground italic">
								(nenhuma subtask concluida)
							</span>
							{nextPendingSubtask && onToggleSubtask && (
								<SubtaskRow
									subtask={nextPendingSubtask}
									onToggle={() => onToggleSubtask(nextPendingSubtask.id)}
								/>
							)}
						</>
					) : (
						<>
							{lastCompletedSubtask && onToggleSubtask && (
								<SubtaskRow
									subtask={lastCompletedSubtask}
									onToggle={() => onToggleSubtask(lastCompletedSubtask.id)}
								/>
							)}
							{nextPendingSubtask && onToggleSubtask && (
								<SubtaskRow
									subtask={nextPendingSubtask}
									onToggle={() => onToggleSubtask(nextPendingSubtask.id)}
								/>
							)}
						</>
					)}
				</div>
			)}
			</button>
		</div>
	);
});

type StatusBadgeProps = {
	variant:
		| "default"
		| "secondary"
		| "destructive"
		| "outline"
		| "success"
		| "warning"
		| "muted";
	label: string;
};

function StatusBadge({ variant, label }: StatusBadgeProps) {
	return (
		<Badge variant={variant} className="shrink-0">
			{label}
		</Badge>
	);
}

type PriorityBadgeProps = {
	priority: number;
};

function PriorityBadge({ priority }: PriorityBadgeProps) {
	const priorityInfo = TASK_ITEM_PRIORITIES.find((p) => p.value === priority);
	const colorClass = priorityInfo?.color || "bg-muted";

	return (
		<Badge className={cn("shrink-0 text-primary-foreground", colorClass)}>
			P{priority}
		</Badge>
	);
}

type DeleteButtonProps = {
	isConfirming: boolean;
	onDelete: () => void;
};

function DeleteButton({ isConfirming, onDelete }: DeleteButtonProps) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				onDelete();
			}}
			className={cn(
				"opacity-0 group-hover:opacity-100 p-1 transition-all shrink-0",
				isConfirming
					? "text-destructive"
					: "text-muted-foreground hover:text-destructive",
			)}
			title={isConfirming ? "Confirmar exclusao" : "Excluir tarefa"}
		>
			{isConfirming ? <Check size={14} /> : <Trash2 size={14} />}
		</button>
	);
}

type SubtaskRowProps = {
	subtask: Subtask;
	onToggle: () => void;
};

function SubtaskRow({ subtask, onToggle }: SubtaskRowProps) {
	const isDone = subtask.status === "done";

	return (
		<button
			type="button"
			className={cn(
				"flex items-center gap-2 text-sm transition-colors hover:bg-secondary/50 rounded px-1 -mx-1",
				isDone && "opacity-50",
			)}
			onClick={(e) => {
				e.stopPropagation();
				onToggle();
			}}
		>
			<Checkbox
				checked={isDone}
				onCheckedChange={onToggle}
				className={cn(
					"text-xs transition-colors",
					isDone ? "text-primary" : "text-muted-foreground hover:text-primary",
				)}
			/>
			<span className={cn("text-foreground", isDone && "line-through")}>
				{subtask.title}
			</span>
		</button>
	);
}
