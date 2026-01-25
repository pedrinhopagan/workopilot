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
import { TASK_PRIORITIES } from "../-utils/useGetTaskQuery";

type TasksListItemProps = {
	task: Task;
	taskFull: TaskFull | null;
	execution: TaskExecution | undefined;
	subtasks: Subtask[];
	isDeleteConfirming: boolean;
	projectColor?: string;
	isDone?: boolean;
	onToggle: () => void;
	onEdit: () => void;
	onToggleSubtask: (subtaskId: string) => void;
	onDelete: () => void;
};

export function TasksListItem({
	task,
	taskFull,
	execution,
	subtasks,
	isDeleteConfirming,
	projectColor,
	isDone = false,
	onToggle,
	onEdit,
	onToggleSubtask,
	onDelete,
}: TasksListItemProps) {
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

	// Última subtask concluída (por completed_at DESC)
	const lastCompletedSubtask =
		subtasks
			.filter((s) => s.status === "done" && s.completed_at)
			.sort((a, b) => {
				const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
				const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
				return dateB - dateA; // DESC
			})[0] || null;

	// Próxima subtask pendente (por order ASC)
	const nextPendingSubtask =
		subtasks
			.filter((s) => s.status !== "done")
			.sort((a, b) => a.order - b.order)[0] || null;

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onEdit();
		}
	}

	if (isDone) {
		return (
			<button
				type="button"
				onClick={onEdit}
				onKeyDown={handleKeyDown}
				className="flex items-center gap-3 px-3 py-2 bg-card border border-transparent hover:border-border hover:bg-secondary/50 transition-all duration-200 group cursor-pointer w-full text-left"
			>
				{projectColor && (
					<span
						className="w-1 h-4 shrink-0 rounded-sm"
						style={{ backgroundColor: projectColor }}
						aria-hidden="true"
					/>
				)}
				<Checkbox
					checked={isDone}
					onCheckedChange={onToggle}
					className="text-primary shrink-0 cursor-pointer"
				/>
				<span className="flex-1 text-foreground text-sm line-through text-left">
					{task.title}
				</span>
				<Badge variant="muted" className="shrink-0">
					{task.category}
				</Badge>
				<DeleteButton isConfirming={isDeleteConfirming} onDelete={onDelete} />
			</button>
		);
	}

	return (
		<div
			className={cn(
				"relative border border-transparent transition-colors duration-200 group",
				"hover:border-border hover:bg-secondary/30",
				containerClass,
				isExecuting && "ring-1 ring-primary",
			)}
			style={
				projectColor
					? {
							borderLeftColor: projectColor,
							borderLeftWidth: "3px",
						}
					: undefined
			}
		>
			<button
				type="button"
				onClick={onEdit}
				onKeyDown={handleKeyDown}
				className="flex items-center gap-3 px-3 py-2 cursor-pointer w-full text-left"
			>
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
						className="text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer"
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

				<DeleteButton isConfirming={isDeleteConfirming} onDelete={onDelete} />
			</button>

			{subtasks.length > 0 && (
				<div className="pl-8 pr-3 pb-2 space-y-1">
					{allSubtasksDone ? (
						<span className="text-xs text-muted-foreground italic">
							(subtasks concluídas)
						</span>
					) : noDoneSubtasks ? (
						<>
							<span className="text-xs text-muted-foreground italic">
								(nenhuma subtask concluída)
							</span>
							{nextPendingSubtask && (
								<SubtaskRow
									subtask={nextPendingSubtask}
									taskId={task.id}
									onToggle={() => onToggleSubtask(nextPendingSubtask.id)}
								/>
							)}
						</>
					) : (
						<>
							{lastCompletedSubtask && (
								<SubtaskRow
									subtask={lastCompletedSubtask}
									taskId={task.id}
									onToggle={() => onToggleSubtask(lastCompletedSubtask.id)}
								/>
							)}
							{nextPendingSubtask && (
								<SubtaskRow
									subtask={nextPendingSubtask}
									taskId={task.id}
									onToggle={() => onToggleSubtask(nextPendingSubtask.id)}
								/>
							)}
						</>
					)}
				</div>
			)}
		</div>
	);
}

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
	const priorityInfo = TASK_PRIORITIES.find((p) => p.value === priority);
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
	taskId: string;
	onToggle: () => void;
};

function SubtaskRow({ subtask, taskId, onToggle }: SubtaskRowProps) {
	const navigate = useNavigate();
	const isDone = subtask.status === "done";

	function handleClick() {
		navigate({ to: "/tasks/$taskId", params: { taskId } });
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			className={cn(
				"flex items-center gap-2 text-sm cursor-pointer transition-colors hover:bg-secondary/50 rounded px-1 -mx-1",
				isDone && "opacity-50",
			)}
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
